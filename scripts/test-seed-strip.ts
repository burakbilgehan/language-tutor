// T-047 round-trip harness: snapshot → seed-strip → VACUUM → re-apply the REAL
// apply*Seed → verify reconstitution against the original.
//   cp <owner>/data/app.db data/app.db
//   npx tsx --tsconfig tsconfig.json scripts/test-seed-strip.ts
//
// Runs the SAME strip through BOTH drivers — better-sqlite3 (server/tests) and
// sql.js (the browser, which is where the upload actually happens in static
// mode) — because "env-agnostic" is a claim about the sql.js path, and the two
// engines must agree on stripped-row counts and on VACUUM actually shrinking
// the file. Reconstitution deliberately calls applyGrammarSeed/applyKanjiSeed/
// applyVocabSeed themselves rather than a local reimplementation: the point is
// to prove the strip inverts the REAL restore path (including its
// native-language refusal), not that it inverts a mock of it.

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import initSqlJs from "sql.js";
import { drizzle as drizzleSqlJs } from "drizzle-orm/sql-js";
import * as schema from "@/db/schema";
// sqlJsStripExec is imported, NOT redefined here: the browser upload path
// (src/lib/backup/cloud.ts) uses this exact function, so the harness exercises
// shipped code rather than a private lookalike that could silently drift.
import {
  stripSeedContent,
  sqlJsStripExec,
  type StripExec,
  type SeedBundle,
} from "@/lib/save/seed-strip";
import { normalizeLangContent } from "@/lib/llm/lang-content";
import { applyGrammarSeed } from "@/core/grammar";
import { applyKanjiSeed } from "@/core/kanji";
import { applyVocabSeed } from "@/core/vocab";
import type { GrammarTopicContent, KanjiContent, VocabContent } from "@/lib/llm/schemas";

const SRC = "data/app.db";
const mb = (b: number) => `${(b / 1024 / 1024).toFixed(2)} MB`;

let fail = 0;
const check = (name: string, cond: boolean, extra = "") => {
  console.log(`${cond ? "OK  " : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`);
  if (!cond) fail++;
};

// ---- driver adapters: the whole point of the StripExec port ----------------
function betterSqlite3Exec(db: Database.Database): StripExec {
  return {
    all: (sql, params = []) =>
      db.prepare(sql).all(...(params as never[])) as Record<string, unknown>[],
    run: (sql, params = []) => {
      db.prepare(sql).run(...(params as never[]));
    },
  };
}

const sqlJsExec = sqlJsStripExec;

function readSeedFile<T>(dir: string, lang: string, field: string): Record<string, T> | null {
  const file = path.join("public", dir, `${lang}.json`);
  if (!fs.existsSync(file)) return null;
  return (JSON.parse(fs.readFileSync(file, "utf8"))[field] ?? null) as Record<string, T> | null;
}

function loadSeeds(langs: string[]): SeedBundle {
  const bundle: SeedBundle = { grammar: {}, kanji: {}, vocab: {} };
  for (const lang of langs) {
    bundle.grammar![lang] = readSeedFile<GrammarTopicContent>("grammar-seed", lang, "topics");
    bundle.kanji![lang] = readSeedFile<KanjiContent>("kanji-seed", lang, "chars");
    bundle.vocab![lang] = readSeedFile<VocabContent>("vocab-seed", lang, "words");
  }
  return bundle;
}

/** status + content per row, keyed lang/naturalKey. Content is compared through
 * normalizeLangContent so the documented legacy→{tr:…} migration-on-read is not
 * counted as a difference. NOTE: this fingerprint covers status and content
 * only — not generated_at, which the strip deliberately clears and apply*Seed
 * resets to its own clock. */
function fingerprint(exec: StripExec) {
  const out: Record<string, Map<string, string>> = {};
  for (const [table, key] of [
    ["grammar_topics", "slug"],
    ["kanji_entries", "char"],
    ["vocab_entries", "word"],
  ] as const) {
    const m = new Map<string, string>();
    for (const r of exec.all(
      `SELECT target_language AS lang, ${key} AS k, status, content FROM ${table}`
    )) {
      const content = r.content ? JSON.stringify(sortDeep(normalizeLangContent(JSON.parse(r.content as string)))) : "";
      m.set(`${r.lang}/${r.k}`, `${r.status}|${content}`);
    }
    out[table] = m;
  }
  return out;
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

function compare(
  before: Record<string, Map<string, string>>,
  after: Record<string, Map<string, string>>
): { checked: number; mismatches: string[] } {
  const mismatches: string[] = [];
  let checked = 0;
  for (const table of Object.keys(before)) {
    for (const [k, orig] of before[table]) {
      checked++;
      const now = after[table].get(k);
      if (now === undefined) mismatches.push(`${table} ${k}: row VANISHED`);
      else if (now !== orig) {
        const [os] = orig.split("|");
        const [ns] = now.split("|");
        mismatches.push(
          os !== ns ? `${table} ${k}: status ${os} → ${ns}` : `${table} ${k}: content differs`
        );
      }
    }
  }
  return { checked, mismatches };
}

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`missing ${SRC} — copy the owner's DB in first`);
    process.exit(1);
  }

  // Baseline snapshot: VACUUM INTO is exactly what exportSave() produces.
  const base = "/tmp/t047-base.db";
  fs.rmSync(base, { force: true });
  const origin = new Database(SRC, { readonly: true });
  origin.prepare("VACUUM INTO ?").run(base);
  const langs = (
    origin.prepare("SELECT DISTINCT target_language AS l FROM profiles").all() as { l: string }[]
  ).map((r) => r.l);
  origin.close();

  const seeds = loadSeeds(langs);
  const sizeBefore = fs.statSync(base).size;
  console.log(`languages: ${langs.join(", ")}`);
  console.log(
    `seeds: ` +
      (["grammar", "kanji", "vocab"] as const)
        .map(
          (kind) =>
            `${kind}[` +
            langs.map((l) => `${l}=${Object.keys(seeds[kind]?.[l] ?? {}).length}`).join(" ") +
            `]`
        )
        .join(" ")
  );
  console.log(`\nsnapshot (pre-strip):  ${mb(sizeBefore)}`);

  const SQL = await initSqlJs({ locateFile: (f: string) => `node_modules/sql.js/dist/${f}` });

  // ================= A. better-sqlite3 strip =================
  const aPath = "/tmp/t047-a.db";
  fs.copyFileSync(base, aPath);
  const a = new Database(aPath);
  const beforeFp = fingerprint(betterSqlite3Exec(a));
  const statsA = stripSeedContent(betterSqlite3Exec(a), seeds);
  a.prepare("VACUUM").run();
  a.close();
  const sizeA = fs.statSync(aPath).size;
  console.log(
    `\n[better-sqlite3] stripped grammar=${statsA.grammar} kanji=${statsA.kanji} vocab=${statsA.vocab}`
  );
  console.log(
    `[better-sqlite3] post-strip: ${mb(sizeA)} (${(sizeBefore / sizeA).toFixed(2)}x smaller, saved ${mb(sizeBefore - sizeA)})`
  );

  // ================= B. sql.js strip (the browser path) =================
  const bDb = new SQL.Database(fs.readFileSync(base));
  const statsB = stripSeedContent(sqlJsExec(bDb), seeds);
  let vacuumOk = true;
  try {
    bDb.run("VACUUM");
  } catch (err) {
    vacuumOk = false;
    console.log(`[sql.js] VACUUM threw: ${String(err)}`);
  }
  const bytesB = bDb.export();
  bDb.close();
  console.log(
    `[sql.js]         stripped grammar=${statsB.grammar} kanji=${statsB.kanji} vocab=${statsB.vocab}`
  );
  console.log(
    `[sql.js]         post-strip: ${mb(bytesB.length)} (VACUUM ${vacuumOk ? "ok" : "FAILED"})`
  );

  check(
    "both drivers strip identically",
    statsA.grammar === statsB.grammar &&
      statsA.kanji === statsB.kanji &&
      statsA.vocab === statsB.vocab,
    `bs3=${JSON.stringify(statsA)} sqljs=${JSON.stringify(statsB)}`
  );
  check("sql.js VACUUM shrinks the image", vacuumOk && bytesB.length < sizeBefore * 0.75, mb(bytesB.length));
  check("strip actually removed rows", statsA.grammar + statsA.kanji + statsA.vocab > 0);

  // ================= C. reconstitute with the REAL apply*Seed =============
  const restored = new SQL.Database(fs.readFileSync(aPath));
  restored.run("PRAGMA foreign_keys = ON");
  const rdb = drizzleSqlJs(restored, { schema });
  let refilled = 0;
  for (const lang of langs) {
    const native = (
      sqlJsExec(restored).all(
        `SELECT native_language AS n FROM profiles WHERE target_language = ?`,
        [lang]
      )[0]?.n ?? "tr"
    ) as "tr" | "en";
    const g = seeds.grammar?.[lang];
    const k = seeds.kanji?.[lang];
    const v = seeds.vocab?.[lang];
    if (g) refilled += applyGrammarSeed(rdb as never, lang, g, native);
    if (k) refilled += applyKanjiSeed(rdb as never, lang, k, native);
    if (v) refilled += applyVocabSeed(rdb as never, lang, v, native);
  }
  console.log(`\nre-applied via real apply*Seed: ${refilled} rows`);

  const afterFp = fingerprint(sqlJsExec(restored));
  restored.close();
  const { checked, mismatches } = compare(beforeFp, afterFp);
  check(`round-trip reconstitutes all ${checked} rows`, mismatches.length === 0,
    mismatches.length ? `${mismatches.length} mismatches: ${mismatches.slice(0, 5).join("; ")}` : "");

  // ================= D. adversarial: en-native profile must NOT be stripped ==
  // apply*Seed refuses non-tr profiles, so stripping such a row would delete
  // the Turkish half with nothing able to refill it.
  const dPath = "/tmp/t047-d.db";
  fs.copyFileSync(base, dPath);
  const d = new Database(dPath);
  const victim = langs[0];
  d.prepare("UPDATE profiles SET native_language = 'en' WHERE target_language = ?").run(victim);
  const statsD = stripSeedContent(betterSqlite3Exec(d), seeds);
  const leftReady = d
    .prepare(
      `SELECT count(*) AS c FROM grammar_topics WHERE target_language = ? AND status = 'ready'`
    )
    .get(victim) as { c: number };
  d.close();
  const baselineReady = (() => {
    const t = new Database(base, { readonly: true });
    const r = t
      .prepare(
        `SELECT count(*) AS c FROM grammar_topics WHERE target_language = ? AND status='ready'`
      )
      .get(victim) as { c: number };
    t.close();
    return r.c;
  })();
  console.log(
    `\n[en-native ${victim}] stripped grammar=${statsD.grammar} (all-tr run: ${statsA.grammar})`
  );
  check(
    `en-native profile (${victim}) keeps its content — apply*Seed would refuse to refill it`,
    leftReady.c === baselineReady,
    `ready ${leftReady.c}/${baselineReady}`
  );

  console.log(`\n${fail === 0 ? "ALL PASS" : `${fail} FAILURES`}`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
