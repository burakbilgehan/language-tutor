// T-047 round-trip harness: export → seed-strip → VACUUM → import → apply*Seed
// → verify reconstitution against the ORIGINAL. Run against the real DB:
//   cp <owner>/data/app.db data/app.db
//   npx tsx --tsconfig tsconfig.json scripts/test-seed-strip.ts
//
// This is the proof that the stripped blob is (a) much smaller and (b) still a
// complete save once the CDN seeds are re-applied. It exercises better-sqlite3;
// the sql.js side of the same module is covered by the parity of raw SQL (the
// module speaks physical column names through a driver-free port).

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { stripSeedContent, type StripExec } from "@/lib/save/seed-strip";
import { normalizeLangContent } from "@/lib/llm/lang-content";
import type {
  GrammarTopicContent,
  KanjiContent,
  VocabContent,
} from "@/lib/llm/schemas";

const SRC = "data/app.db";
const WORK = "/tmp/t047-roundtrip.db";

function makeExec(db: Database.Database): StripExec {
  return {
    all: (sql, params = []) =>
      db.prepare(sql).all(...(params as never[])) as Record<string, unknown>[],
    run: (sql, params = []) => {
      db.prepare(sql).run(...(params as never[]));
    },
  };
}

function readSeed<T>(dir: string, lang: string, field: string): Record<string, T> | null {
  const file = path.join("public", dir, `${lang}.json`);
  if (!fs.existsSync(file)) return null;
  const body = JSON.parse(fs.readFileSync(file, "utf8"));
  return (body[field] ?? null) as Record<string, T> | null;
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

function contentFingerprint(db: Database.Database) {
  // Per-table map of key → stored content string, for exact comparison.
  const out: Record<string, Map<string, string | null>> = {};
  for (const [table, key] of [
    ["grammar_topics", "slug"],
    ["kanji_entries", "char"],
    ["vocab_entries", "word"],
  ] as const) {
    const m = new Map<string, string | null>();
    const rows = db
      .prepare(`SELECT target_language AS lang, ${key} AS k, status, content FROM ${table}`)
      .all() as { lang: string; k: string; status: string; content: string | null }[];
    for (const r of rows) m.set(`${r.lang}/${r.k}`, `${r.status}|${r.content ?? ""}`);
    out[table] = m;
  }
  return out;
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`missing ${SRC} — copy the owner's DB in first`);
    process.exit(1);
  }

  // ---- 1. Baseline: a VACUUM'd copy stands in for exportSave's snapshot ----
  fs.rmSync(WORK, { force: true });
  const origin = new Database(SRC, { readonly: true });
  origin.prepare("VACUUM INTO ?").run(WORK);
  const before = contentFingerprint(origin);
  const langs = (
    origin.prepare("SELECT DISTINCT target_language AS l FROM profiles").all() as {
      l: string;
    }[]
  ).map((r) => r.l);
  origin.close();

  const sizeBefore = fs.statSync(WORK).size;
  console.log(`snapshot (pre-strip):  ${mb(sizeBefore)}`);

  // ---- 2. Load the packaged seeds (what the CDN serves) --------------------
  const seeds: {
    grammar: Record<string, Record<string, GrammarTopicContent> | null>;
    kanji: Record<string, Record<string, KanjiContent> | null>;
    vocab: Record<string, Record<string, VocabContent> | null>;
  } = { grammar: {}, kanji: {}, vocab: {} };
  for (const lang of langs) {
    seeds.grammar[lang] = readSeed<GrammarTopicContent>("grammar-seed", lang, "topics");
    seeds.kanji[lang] = readSeed<KanjiContent>("kanji-seed", lang, "chars");
    seeds.vocab[lang] = readSeed<VocabContent>("vocab-seed", lang, "words");
  }
  const count = (m: Record<string, Record<string, unknown> | null>) =>
    Object.entries(m)
      .map(([l, v]) => `${l}=${v ? Object.keys(v).length : 0}`)
      .join(" ");
  console.log(`seeds: grammar[${count(seeds.grammar)}] kanji[${count(seeds.kanji)}] vocab[${count(seeds.vocab)}]`);

  // ---- 3. Strip + VACUUM ---------------------------------------------------
  const work = new Database(WORK);
  const stats = stripSeedContent(makeExec(work), seeds);
  console.log(`stripped rows: grammar=${stats.grammar} kanji=${stats.kanji} vocab=${stats.vocab}`);
  work.prepare("VACUUM").run();
  work.close();

  const sizeAfter = fs.statSync(WORK).size;
  console.log(
    `snapshot (post-strip): ${mb(sizeAfter)}  ` +
      `(${(sizeBefore / sizeAfter).toFixed(1)}x smaller, saved ${mb(sizeBefore - sizeAfter)})`
  );

  // ---- 4. Reconstitute: apply the seeds the way a restore would ------------
  // Mirrors apply*Seed exactly (status pending/error + seed hit → merge tr).
  const restored = new Database(WORK);
  let refilled = 0;
  for (const [table, key, seedMap] of [
    ["grammar_topics", "slug", seeds.grammar],
    ["kanji_entries", "char", seeds.kanji],
    ["vocab_entries", "word", seeds.vocab],
  ] as const) {
    const rows = restored
      .prepare(
        `SELECT id, target_language AS lang, ${key} AS k, content FROM ${table} ` +
          `WHERE status IN ('pending','error')`
      )
      .all() as { id: string; lang: string; k: string; content: string | null }[];
    for (const r of rows) {
      const langSeed = (seedMap as Record<string, Record<string, unknown> | null>)[r.lang];
      if (!langSeed) continue;
      const content = langSeed[r.k];
      if (content === undefined) continue;
      const existing = r.content ? JSON.parse(r.content) : {};
      const isLangKeyed =
        existing && typeof existing === "object" && ("tr" in existing || "en" in existing);
      const merged = { ...(isLangKeyed ? existing : existing.title_tr ? { tr: existing } : {}), tr: content };
      restored
        .prepare(`UPDATE ${table} SET content = ?, status = 'ready' WHERE id = ?`)
        .run(JSON.stringify(merged), r.id);
      refilled++;
    }
  }
  console.log(`re-applied from seed: ${refilled} rows`);
  const after = contentFingerprint(restored);
  restored.close();

  // ---- 5. Verify: every originally-ready row is ready again with equal content
  let mismatches = 0;
  let checked = 0;
  const samples: string[] = [];
  for (const table of Object.keys(before)) {
    for (const [k, orig] of before[table]) {
      const now = after[table].get(k);
      checked++;
      if (now === undefined) {
        mismatches++;
        if (samples.length < 8) samples.push(`${table} ${k}: row VANISHED`);
        continue;
      }
      const [origStatus, ...origRest] = orig!.split("|");
      const [nowStatus, ...nowRest] = now.split("|");
      const origContent = origRest.join("|");
      const nowContent = nowRest.join("|");
      if (origStatus !== nowStatus) {
        mismatches++;
        if (samples.length < 8)
          samples.push(`${table} ${k}: status ${origStatus} → ${nowStatus}`);
        continue;
      }
      // Content must be semantically equal AS THE APP READS IT. Two normalizations
      // are legitimate and must not count as mismatches:
      //   - key ORDER (we rebuilt the lang map) → sortDeep
      //   - a LEGACY BARE payload becoming {tr: payload}. That is the documented
      //     migration-on-read in src/lib/llm/lang-content.ts: the first re-serialize
      //     of a pre-T-031 row wraps it. readLangContent() returns the identical
      //     value either way, so comparing the normalized maps is the correct
      //     equivalence — comparing raw storage would flag every legacy row.
      const canon = (s: string) =>
        s ? JSON.stringify(sortDeep(normalizeLangContent<unknown>(JSON.parse(s)))) : "";
      if (origContent !== nowContent && canon(origContent) !== canon(nowContent)) {
        mismatches++;
        if (samples.length < 8)
          samples.push(
            `${table} ${k}: content differs (${origContent.length} vs ${nowContent.length} bytes)`
          );
      }
    }
  }

  console.log(`\nverified ${checked} rows; ${mismatches} mismatches`);
  if (samples.length) console.log(samples.join("\n"));
  console.log(mismatches === 0 ? "ROUND-TRIP: PASS" : "ROUND-TRIP: FAIL");
  process.exit(mismatches === 0 ? 0 : 1);
}

function sortDeep(v: unknown): unknown {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(sortDeep);
  return Object.fromEntries(
    Object.entries(v as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, val]) => [k, sortDeep(val)])
  );
}

main();
