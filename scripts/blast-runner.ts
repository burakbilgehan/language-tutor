// Single-block generation runner for the blast dashboard queue.
// A "block" is one (kind, targetLanguage, nativeLanguage, level) unit:
//   kind grammar|kanji|vocab  -> direct DB generation (pending/error rows),
//                                same posture as scripts/blast-generate.ts
//   kind grammar-mt           -> MT of the packaged tr grammar seed into
//                                <lang>.<native>.json (T-064 pipeline,
//                                same checks as scripts/mt-grammar-seed.ts)
// Spawned by scripts/blast-dashboard.mjs; manual use:
//   npx tsx --tsconfig tsconfig.json scripts/blast-runner.ts \
//     --kind grammar --lang ja --level N5 --conc 8
//   npx tsx --tsconfig tsconfig.json scripts/blast-runner.ts \
//     --kind grammar-mt --lang nl --native en --level A1 --conc 8 [--stub]
// Output protocol (the dashboard parses these lines; keep the shapes):
//   RUN kind=<k> lang=<l> native=<n> level=<lv> total=<n> conc=<c>
//   [HH:MM:SS] OK <label>
//   [HH:MM:SS] FAIL <label>: <message>
//   DONE ok=<n> fail=<n> <sec>s
import fs from "node:fs";
import path from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import * as tables from "@/db/schema";
import { getProvider } from "@/lib/llm/provider";
import {
  generateGrammarContent,
  generateKanjiContent,
  generateVocabContent,
} from "@/core/llm-gen";
import { GrammarTopicSchema, type GrammarTopicContent } from "@/lib/llm/schemas";
import { LlmEngine, StubEngine, type TranslateEngine } from "./mt/engine";
import { translateGrammarTopic } from "./mt/translate-grammar-topic";

const SEED_DIR = "public/grammar-seed";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const kind = arg("kind") ?? "";
const lang = arg("lang") ?? "";
const level = arg("level") ?? "";
const native = arg("native") ?? "tr";
const conc = Math.max(1, Math.min(32, Number(arg("conc")) || 4));
const useStub = process.argv.includes("--stub");

if (!["grammar", "kanji", "vocab", "grammar-mt"].includes(kind) || !lang || !level) {
  console.error(
    "usage: blast-runner --kind grammar|kanji|vocab|grammar-mt --lang <xx> --level <lv> [--native en] [--conc N] [--stub]"
  );
  process.exit(2);
}

function ts() {
  return `[${new Date().toTimeString().slice(0, 8)}]`;
}

let ok = 0;
let fail = 0;
const t0 = Date.now();

async function pool<T>(items: T[], work: (item: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(conc, items.length) }, async () => {
      while (i < items.length) await work(items[i++]);
    })
  );
}

function done(): never {
  console.log(`DONE ok=${ok} fail=${fail} ${Math.round((Date.now() - t0) / 1000)}s`);
  process.exit(0);
}

async function runDbKind() {
  const gen = getProvider();
  const statuses = ["pending", "error"] as const;
  type Row = { id: string; label: string };
  let rows: Row[];
  if (kind === "grammar") {
    rows = db
      .select({ id: tables.grammarTopics.id, slug: tables.grammarTopics.slug })
      .from(tables.grammarTopics)
      .where(
        and(
          eq(tables.grammarTopics.targetLanguage, lang),
          eq(tables.grammarTopics.level, level),
          inArray(tables.grammarTopics.status, statuses)
        )
      )
      .all()
      .map((r) => ({ id: r.id, label: `g:${lang}/${r.slug}` }));
  } else if (kind === "kanji") {
    rows = db
      .select({ id: tables.kanjiEntries.id, char: tables.kanjiEntries.char })
      .from(tables.kanjiEntries)
      .where(
        and(
          eq(tables.kanjiEntries.targetLanguage, lang),
          eq(tables.kanjiEntries.level, level),
          inArray(tables.kanjiEntries.status, statuses)
        )
      )
      .all()
      .map((r) => ({ id: r.id, label: `k:${r.char}` }));
  } else {
    rows = db
      .select({ id: tables.vocabEntries.id, word: tables.vocabEntries.word })
      .from(tables.vocabEntries)
      .where(
        and(
          eq(tables.vocabEntries.targetLanguage, lang),
          eq(tables.vocabEntries.level, level),
          inArray(tables.vocabEntries.status, statuses)
        )
      )
      .all()
      .map((r) => ({ id: r.id, label: `v:${r.word}` }));
  }
  console.log(
    `RUN kind=${kind} lang=${lang} native=${native} level=${level} total=${rows.length} conc=${conc}`
  );
  await pool(rows, async (row) => {
    try {
      if (kind === "grammar") await generateGrammarContent(db as never, gen, row.id);
      else if (kind === "kanji") await generateKanjiContent(db as never, gen, row.id);
      else await generateVocabContent(db as never, gen, row.id);
      ok++;
      console.log(`${ts()} OK ${row.label}`);
    } catch (e) {
      fail++;
      console.log(`${ts()} FAIL ${row.label}: ${(e as Error).message?.slice(0, 120)}`);
    }
  });
  done();
}

async function runMtKind() {
  const inPath = path.join(SEED_DIR, `${lang}.json`);
  if (!fs.existsSync(inPath)) {
    console.error(`bulunamadı: ${inPath} (önce npm run seed:grammar)`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(inPath, "utf8")) as {
    topics: Record<string, unknown>;
  };
  // slug -> level comes from the DB (the grammar index is the same data, but
  // the DB is already queryable from here without importing lang-specific TS).
  const levelOf = new Map(
    db
      .select({ slug: tables.grammarTopics.slug, level: tables.grammarTopics.level })
      .from(tables.grammarTopics)
      .where(eq(tables.grammarTopics.targetLanguage, lang))
      .all()
      .map((r) => [r.slug, r.level])
  );
  // Stub output goes to its own file, same poison-guard as mt-grammar-seed.ts.
  const outPath = path.join(SEED_DIR, `${lang}.${native}${useStub ? ".stub" : ""}.json`);
  const existing: { version: number; topics: Record<string, GrammarTopicContent> } =
    fs.existsSync(outPath)
      ? JSON.parse(fs.readFileSync(outPath, "utf8"))
      : { version: 1, topics: {} };
  const slugs = Object.keys(raw.topics).filter(
    (slug) => levelOf.get(slug) === level && !existing.topics[slug]
  );
  console.log(
    `RUN kind=${kind} lang=${lang} native=${native} level=${level} total=${slugs.length} conc=${conc}`
  );
  const engine: TranslateEngine = useStub ? new StubEngine() : new LlmEngine(lang, native);
  await pool(slugs, async (slug) => {
    const label = `mt:${lang}->${native}/${slug}`;
    const parsed = GrammarTopicSchema.safeParse(raw.topics[slug]);
    if (!parsed.success) {
      fail++;
      console.log(`${ts()} FAIL ${label}: tr seed şemaya uymuyor`);
      return;
    }
    try {
      const { content, placeholderFailures } = await translateGrammarTopic(parsed.data, engine);
      if (placeholderFailures > 0) {
        fail++;
        console.log(`${ts()} FAIL ${label}: ${placeholderFailures} alanda CJK/bracket bozuldu`);
        return;
      }
      const revalidated = GrammarTopicSchema.safeParse(content);
      if (!revalidated.success) {
        fail++;
        console.log(`${ts()} FAIL ${label}: çeviri sonrası şemaya uymuyor`);
        return;
      }
      // Incremental write after every success: a killed run keeps its progress
      // (workers are concurrent but JS is single-threaded, writes don't race).
      existing.topics[slug] = revalidated.data;
      fs.writeFileSync(outPath, JSON.stringify(existing));
      ok++;
      console.log(`${ts()} OK ${label}`);
    } catch (e) {
      fail++;
      console.log(`${ts()} FAIL ${label}: ${(e as Error).message?.slice(0, 120)}`);
    }
  });
  done();
}

if (kind === "grammar-mt") runMtKind();
else runDbKind();
