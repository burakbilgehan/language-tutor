// Driver for T-089 (nl grammar regen, all 72 topics x tr+en) and T-090
// (25 confirmed-critical items: zh vocab, ja kanji, grammar topics).
// Writes ONLY to the DB at process.cwd()/data/app.db (src/db/index.ts is
// hardcoded to that path) -- run this with cwd = the checkout that holds
// the target data/app.db, script + tsconfig resolved from wherever this
// file actually lives:
//
//   cd /Users/burakkaanbilgehan/language-tutor && \
//     LLM_MODEL_FAST=sonnet npx tsx --tsconfig <worktree>/tsconfig.json \
//     <worktree>/scripts/regen-content.ts nl-grammar
//     <worktree>/scripts/regen-content.ts criticals
//
// Bounded worker pool (default 4, --conc N to override): every LLM call
// runs against one node process, so all DB writes happen in that same
// process and better-sqlite3 serializes them in-process; only the CLI
// subprocess spawns run concurrently. Concurrency backs off dynamically on
// rate-limit/overloaded errors (see BACKOFF below) and drops to serial
// after two consecutive such errors. A resume ledger (data/regen-ledger.json,
// next to the DB) records completed units so a killed/relaunched run does
// not redo finished work or burn extra calls.
import fs from "node:fs";
import path from "node:path";
import { eq, and } from "drizzle-orm";
import { db, tables } from "@/db";
import { getProvider } from "@/lib/llm/provider";
import {
  generateGrammarContent,
  generateKanjiContent,
  generateVocabContent,
} from "@/core/llm-gen";
import {
  GrammarTopicSchema,
  KanjiContentSchema,
  VocabContentSchema,
  type GrammarTopicContent,
} from "@/lib/llm/schemas";
import { normalizeLangContent, type NativeLang } from "@/lib/llm/lang-content";
import { LlmQuotaError } from "@/lib/llm/provider-types";
import { COLUMN_HEALS } from "@/db/heals";

// Additive schema self-heal, same as blast-runner.ts: a long-running local
// DB never replays heals on its own.
for (const stmt of COLUMN_HEALS) {
  try {
    db.$client.exec(stmt);
  } catch {
    /* already healed */
  }
}
// Sibling agents take a read-only snapshot of this same file early in the
// wave; retry instead of failing on a transient lock.
db.$client.pragma("busy_timeout = 15000");

const LEDGER_PATH = path.join(process.cwd(), "data", "regen-ledger.json");

function loadLedger(): Record<string, true> {
  try {
    return JSON.parse(fs.readFileSync(LEDGER_PATH, "utf8"));
  } catch {
    return {};
  }
}
function saveLedger(l: Record<string, true>) {
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(l, null, 2));
}
const ledger = loadLedger();
function mark(key: string) {
  ledger[key] = true;
  saveLedger(ledger);
}

function ts() {
  return `[${new Date().toTimeString().slice(0, 8)}]`;
}

// ---------------------------------------------------------------------------
// Concurrency + backoff state machine.
//
// LlmQuotaError (claude-cli.ts QUOTA_RE) covers two different situations
// that need different responses:
//   - transient: "overloaded", "429", "too many requests" -> back off
//     (halve concurrency), the run should continue.
//   - exhausted: "usage limit", "rate limit reached", "resets at/in ..." ->
//     the 5h window is actually spent; stop the run entirely and report,
//     per the owner's instruction not to burn retries against a dead quota.
// ---------------------------------------------------------------------------

const TRANSIENT_RE = /overloaded|429|too many requests/i;

// --conc=N sets the starting pool size; --max-conc=N sets the ceiling the
// pool is allowed to creep back up to after sustained clean calls (default
// 20, per the owner's second override -- "raise to 16 now, go to 20 after
// 10 clean minutes"). Kept as a flag rather than a literal so a further
// change doesn't require another hand-edit + relaunch cycle.
function argNum(flag: string, fallback: number): number {
  const raw = process.argv.find((a) => a.startsWith(`--${flag}=`))?.split("=")[1];
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}
const MAX_CONCURRENCY = Math.max(1, argNum("max-conc", 20));
// Clean-minutes-required-before-creep-up is also a flag: the owner's second
// override shortened this from 15 to 10 minutes.
const CREEP_MINUTES = Math.max(1, argNum("creep-min", 10));

let concurrency = Math.max(1, Math.min(MAX_CONCURRENCY, argNum("conc", 4)));
const startConcurrency = concurrency;
let minConcurrencySeen = concurrency;
let consecutiveTransient = 0;
let droppedToSerialNote = "";
let quotaExhausted = false;
let quotaExhaustedDetail = "";
let cleanSince = Date.now();

function noteTransientError(detail: string) {
  consecutiveTransient++;
  console.log(
    `${ts()} BACKOFF transient rate-limit/overloaded (${consecutiveTransient} consecutive): ${detail.slice(0, 160)}`
  );
  if (consecutiveTransient >= 2 && concurrency > 1) {
    concurrency = 1;
    droppedToSerialNote = `dropped to serial after ${consecutiveTransient} consecutive transient errors`;
    console.log(`${ts()} CONCURRENCY -> 1 (${droppedToSerialNote})`);
  } else if (concurrency > 1) {
    concurrency = Math.max(1, Math.floor(concurrency / 2));
    console.log(`${ts()} CONCURRENCY -> ${concurrency} (halved on transient error)`);
  }
  minConcurrencySeen = Math.min(minConcurrencySeen, concurrency);
  cleanSince = Date.now();
}
function noteCleanCall() {
  consecutiveTransient = 0;
  // Creeps back up to MAX_CONCURRENCY after CREEP_MINUTES clean minutes at
  // the current level. Never exceeds the configured ceiling.
  if (concurrency < MAX_CONCURRENCY && Date.now() - cleanSince >= CREEP_MINUTES * 60_000) {
    concurrency = Math.min(MAX_CONCURRENCY, concurrency + 1);
    console.log(`${ts()} CONCURRENCY -> ${concurrency} (${CREEP_MINUTES} clean minutes)`);
    cleanSince = Date.now();
  }
}

// Labels of halves that failed on a non-quota error and were NOT marked done
// in the ledger (a relaunch retries them). Surfaced in the final report as
// "anything unverified or skipped".
const failures: string[] = [];

/** Returns true only when `fn` actually completed the LLM call + write.
 * Quota-exhausted stops the whole run. A transient rate-limit/overloaded
 * error triggers backoff and is retried by simply leaving the ledger key
 * unmarked (picked back up by the pool). Any OTHER error is logged and
 * swallowed so one bad call can't kill the rest of a large serial-cost run
 * -- but the caller must NOT mark the ledger key on false, or a failed half
 * would be permanently (and silently) skipped. */
const transientSkipped: string[] = [];

async function attemptCall(label: string, fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn();
    noteCleanCall();
    return true;
  } catch (e) {
    if (e instanceof LlmQuotaError) {
      const detail = e.rawOutput ?? e.message;
      if (TRANSIENT_RE.test(detail)) {
        noteTransientError(detail);
        // NOT retried within this process -- runPool only ever advances its
        // cursor, it never re-queues a failed item. The unit is left
        // unmarked in the ledger (this same relaunch invocation moves on to
        // the next unit; a fresh `nl-grammar`/`criticals` relaunch is what
        // actually retries it, resuming from the ledger).
        transientSkipped.push(label);
        return false;
      }
      quotaExhausted = true;
      quotaExhaustedDetail = detail.slice(0, 200);
      console.log(`${ts()} QUOTA-EXHAUSTED ${label}: ${quotaExhaustedDetail}`);
      return false;
    }
    failures.push(label);
    console.log(`${ts()} FAIL ${label}: ${(e as Error).message?.slice(0, 200)}`);
    return false;
  }
}

/** Bounded concurrent pool over `items`. `concurrency` is read live on every
 * loop iteration of every worker, so a mid-run backoff shrinks the pool
 * immediately (workers already in flight finish; new ones don't start
 * beyond the new limit) and a later creep-up spawns additional workers. */
async function runPool<T>(items: T[], work: (item: T) => Promise<void>) {
  let next = 0;
  let liveWorkers = 0;
  await new Promise<void>((resolve) => {
    const maybeSpawn = () => {
      if (quotaExhausted) {
        if (liveWorkers === 0) resolve();
        return;
      }
      while (liveWorkers < concurrency && next < items.length) {
        const item = items[next++];
        liveWorkers++;
        work(item)
          .catch((e) => console.log(`${ts()} POOL-ERROR: ${(e as Error).message}`))
          .finally(() => {
            liveWorkers--;
            maybeSpawn();
          });
      }
      if (liveWorkers === 0 && (next >= items.length || quotaExhausted)) resolve();
    };
    maybeSpawn();
  });
}

// ---------------------------------------------------------------------------
// T-089: regenerate all 72 nl grammar_topics rows, tr + en, then null the
// reading field on every example (nl has no transcription convention; the
// prompt now says so too, but this is the deterministic guarantee).
// ---------------------------------------------------------------------------

function nullNlReadings(content: unknown): GrammarTopicContent | unknown {
  const parsed = GrammarTopicSchema.safeParse(content);
  if (!parsed.success) return content;
  return {
    ...parsed.data,
    examples: parsed.data.examples.map((ex) => ({ ...ex, reading: null })),
  } satisfies GrammarTopicContent;
}

/** Once BOTH lang halves of a unit are in the ledger, run the finalize
 * callback exactly once. Guards against the concurrent case where tr and en
 * finish in either order on different workers -- a simple mutex per key so
 * two workers finishing back-to-back don't double-finalize. */
const finalizedUnits = new Set<string>();
function tryFinalize(unitKey: string, bothKeys: [string, string], finalize: () => void) {
  if (finalizedUnits.has(unitKey)) return;
  if (ledger[bothKeys[0]] && ledger[bothKeys[1]]) {
    finalizedUnits.add(unitKey);
    finalize();
  }
}

async function regenNlGrammar() {
  const gen = getProvider();
  const topics = db
    .select()
    .from(tables.grammarTopics)
    .where(eq(tables.grammarTopics.targetLanguage, "nl"))
    .orderBy(tables.grammarTopics.position)
    .all();
  console.log(`RUN nl-grammar total=${topics.length} conc=${concurrency}`);

  // IMPORTANT: the work unit is the ROW, not the (row, lang) pair.
  // generateGrammarContent reads the row, awaits the LLM call (60-110s),
  // then writes mergeLangContent(<the pre-call snapshot>, lang, fresh) --
  // a read-modify-write with no optimistic lock. If tr and en of the SAME
  // row were separate pool items, two concurrent workers would each read
  // the old {tr,en} pair and the second write-back would silently discard
  // the first worker's result (lost update). Keeping both langs of one row
  // inside a single worker (sequential within the row, concurrent across
  // rows) gets full pool throughput with zero intra-row overlap.
  type Unit = { topicId: string; slug: string; langs: NativeLang[] };
  const units: Unit[] = [];
  for (const topic of topics) {
    const langs = (["tr", "en"] as NativeLang[]).filter(
      (lang) => !ledger[`nl-grammar:${topic.slug}:${lang}`]
    );
    if (langs.length) units.push({ topicId: topic.id, slug: topic.slug, langs });
    // Already-complete units from a prior run still need their finalize
    // check (idempotent: re-nulling already-null readings is a no-op, but
    // this makes a resumed run self-healing if a previous run crashed
    // between marking both keys and finalizing).
    const bothKeys: [string, string] = [
      `nl-grammar:${topic.slug}:tr`,
      `nl-grammar:${topic.slug}:en`,
    ];
    tryFinalize(`nl-grammar:${topic.slug}`, bothKeys, () => finalizeNlTopic(topic.id));
  }

  await runPool(units, async (u) => {
    for (const lang of u.langs) {
      const key = `nl-grammar:${u.slug}:${lang}`;
      const label = `${u.slug} (${lang})`;
      const success = await attemptCall(label, () =>
        generateGrammarContent(db as never, gen, u.topicId, lang)
      );
      if (!success) return; // quota/transient/failure: left unmarked, retried on relaunch
      mark(key);
      console.log(`${ts()} OK ${label}`);
    }
    tryFinalize(
      `nl-grammar:${u.slug}`,
      [`nl-grammar:${u.slug}:tr`, `nl-grammar:${u.slug}:en`],
      () => finalizeNlTopic(u.topicId)
    );
  });

  console.log(`DONE nl-grammar topics-completed=${finalizedUnits.size}/${topics.length}`);
}

function finalizeNlTopic(topicId: string) {
  const row = db
    .select()
    .from(tables.grammarTopics)
    .where(eq(tables.grammarTopics.id, topicId))
    .limit(1)
    .get()!;
  const map = normalizeLangContent<GrammarTopicContent>(row.content);
  const cleaned: typeof map = {
    ...map,
    tr: map.tr ? (nullNlReadings(map.tr) as GrammarTopicContent) : map.tr,
    en: map.en ? (nullNlReadings(map.en) as GrammarTopicContent) : map.en,
  };
  db.update(tables.grammarTopics)
    .set({ content: cleaned, status: "ready", generatedAt: new Date() })
    .where(eq(tables.grammarTopics.id, topicId))
    .run();
}

// ---------------------------------------------------------------------------
// T-090: 25 confirmed-critical items (10 zh vocab, 7 ja kanji, 8 grammar).
// ---------------------------------------------------------------------------

const ZH_VOCAB = ["竟然", "脏", "悬念", "惭愧", "请示", "悔恨", "臂", "敬礼", "所以", "赔偿"];
const JA_KANJI = ["諒", "遇", "鷹", "啓", "棺", "朝", "苑"];
const GRAMMAR_TOPICS: { lang: string; slug: string }[] = [
  { lang: "ja", slug: "koto-tote" },
  { lang: "ja", slug: "nante-nanka" },
  { lang: "ja", slug: "made-mo-nai" },
  { lang: "zh", slug: "you-you" },
  { lang: "zh", slug: "tone-sandhi" },
  { lang: "zh", slug: "buzhiyu" },
  { lang: "fr", slug: "interrogative-pronouns" },
  { lang: "fr", slug: "agreement-advanced" },
];

async function regenCriticals() {
  const gen = getProvider();

  const vocabRows = db
    .select()
    .from(tables.vocabEntries)
    .where(eq(tables.vocabEntries.targetLanguage, "zh"))
    .all()
    .filter((r) => ZH_VOCAB.includes(r.word));
  const missing = ZH_VOCAB.filter((w) => !vocabRows.some((r) => r.word === w));
  if (missing.length) throw new Error(`zh vocab words not found in DB: ${missing.join(", ")}`);

  const kanjiRows = db
    .select()
    .from(tables.kanjiEntries)
    .where(eq(tables.kanjiEntries.targetLanguage, "ja"))
    .all()
    .filter((r) => JA_KANJI.includes(r.char));
  const missingK = JA_KANJI.filter((c) => !kanjiRows.some((r) => r.char === c));
  if (missingK.length) throw new Error(`ja kanji not found in DB: ${missingK.join(", ")}`);

  const grammarRows = GRAMMAR_TOPICS.map((t) => {
    const row = db
      .select()
      .from(tables.grammarTopics)
      .where(and(eq(tables.grammarTopics.targetLanguage, t.lang), eq(tables.grammarTopics.slug, t.slug)))
      .limit(1)
      .get();
    if (!row) throw new Error(`grammar topic not found: ${t.lang}/${t.slug}`);
    return row;
  });

  console.log(
    `RUN criticals vocab=${vocabRows.length} kanji=${kanjiRows.length} grammar=${grammarRows.length} conc=${concurrency}`
  );

  // Same rule as regenNlGrammar: the work unit is the ROW (both langs
  // handled sequentially by one worker), never a bare (row, lang) pair --
  // generateVocabContent/generateKanjiContent/generateGrammarContent all
  // do the same read-then-await-then-merge-write with no lock, so two
  // concurrent workers on the same row would lose one language's update.
  type Unit =
    | { kind: "vocab"; id: string; label: string; langs: NativeLang[] }
    | { kind: "kanji"; id: string; label: string; langs: NativeLang[] }
    | { kind: "grammar"; id: string; label: string; langs: NativeLang[] };

  const units: Unit[] = [];

  for (const row of vocabRows) {
    const langs = (["tr", "en"] as NativeLang[]).filter((l) => !ledger[`vocab:${row.word}:${l}`]);
    if (langs.length) units.push({ kind: "vocab", id: row.id, label: row.word, langs });
    tryFinalize(`vocab:${row.word}`, [`vocab:${row.word}:tr`, `vocab:${row.word}:en`], () =>
      db
        .update(tables.vocabEntries)
        .set({ status: "ready", generatedAt: new Date() })
        .where(eq(tables.vocabEntries.id, row.id))
        .run()
    );
  }
  for (const row of kanjiRows) {
    const langs = (["tr", "en"] as NativeLang[]).filter((l) => !ledger[`kanji:${row.char}:${l}`]);
    if (langs.length) units.push({ kind: "kanji", id: row.id, label: row.char, langs });
    tryFinalize(`kanji:${row.char}`, [`kanji:${row.char}:tr`, `kanji:${row.char}:en`], () =>
      db
        .update(tables.kanjiEntries)
        .set({ status: "ready", generatedAt: new Date() })
        .where(eq(tables.kanjiEntries.id, row.id))
        .run()
    );
  }
  for (const row of grammarRows) {
    const itemKey = `grammar:${row.targetLanguage}/${row.slug}`;
    const langs = (["tr", "en"] as NativeLang[]).filter((l) => !ledger[`${itemKey}:${l}`]);
    if (langs.length)
      units.push({ kind: "grammar", id: row.id, label: `${row.targetLanguage}/${row.slug}`, langs });
    tryFinalize(itemKey, [`${itemKey}:tr`, `${itemKey}:en`], () =>
      db
        .update(tables.grammarTopics)
        .set({ status: "ready", generatedAt: new Date() })
        .where(eq(tables.grammarTopics.id, row.id))
        .run()
    );
  }

  await runPool(units, async (u) => {
    const prefix = u.kind === "vocab" ? "v" : u.kind === "kanji" ? "k" : "g";
    for (const lang of u.langs) {
      const key = `${u.kind}:${u.label}:${lang}`;
      const label = `${prefix}:${u.label} (${lang})`;
      const success = await attemptCall(label, () => {
        if (u.kind === "vocab") return generateVocabContent(db as never, gen, u.id, lang);
        if (u.kind === "kanji") return generateKanjiContent(db as never, gen, u.id, lang);
        return generateGrammarContent(db as never, gen, u.id, lang);
      });
      if (!success) return; // quota/transient/failure: left unmarked, retried on relaunch
      mark(key);
      console.log(`${ts()} OK ${label}`);
    }
    const itemKey = `${u.kind}:${u.label}`;
    const bothKeys: [string, string] = [`${itemKey}:tr`, `${itemKey}:en`];
    if (u.kind === "vocab") {
      tryFinalize(itemKey, bothKeys, () =>
        db
          .update(tables.vocabEntries)
          .set({ status: "ready", generatedAt: new Date() })
          .where(eq(tables.vocabEntries.id, u.id))
          .run()
      );
    } else if (u.kind === "kanji") {
      tryFinalize(itemKey, bothKeys, () =>
        db
          .update(tables.kanjiEntries)
          .set({ status: "ready", generatedAt: new Date() })
          .where(eq(tables.kanjiEntries.id, u.id))
          .run()
      );
    } else {
      tryFinalize(itemKey, bothKeys, () =>
        db
          .update(tables.grammarTopics)
          .set({ status: "ready", generatedAt: new Date() })
          .where(eq(tables.grammarTopics.id, u.id))
          .run()
      );
    }
  });

  console.log("DONE criticals");
}

// ---------------------------------------------------------------------------
// T-093: targeted regen fed straight from a validate-content.mjs JSON report.
// Selects three finding classes (headword_missing, script_contamination:
// foreign_script, pinyin_mismatch:syllable_mismatch minus slash-alternation
// notation), groups them into row-as-unit work items (tr+en sequential in
// one worker, same lost-update rule as the other modes), regenerates each
// flagged language half, then verifies the targeted defect classes against
// the fresh payload with the ported validator checks (scripts/
// t093-checks.mjs). A failed verify re-rolls the half up to MAX_ATTEMPTS.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore untyped .mjs helper module
import { buildReadingTable, verifyHalf } from "./t093-checks.mjs";

function argStr(flag: string, fallback: string): string {
  const raw = process.argv.find((a) => a.startsWith(`--${flag}=`))?.split("=")[1];
  return raw || fallback;
}

const T093_MAX_ATTEMPTS = 3;
const T093_VERIFY_LOG = path.join(process.cwd(), "data", "t093-verify.jsonl");
const T093_REPORT = path.join(process.cwd(), "data", "t093-report.json");

type T093Class = "headword" | "foreign" | "pinyin";
type T093Kind = "vocab" | "kanji" | "grammar";

async function regenT093() {
  const gen = getProvider();
  const targetsPath = argStr("targets", "tickets/T-093-validator-before.json");
  const report = JSON.parse(fs.readFileSync(targetsPath, "utf8")) as {
    findings: {
      table: string;
      id: string;
      key: string;
      lang: string | null;
      class: string;
      detail?: { severity?: string; reading?: string };
    }[];
  };

  // finding class -> T093Class, with the exclusions the spec names.
  let excludedAlternation = 0;
  const classBefore = { headword: 0, foreign: 0, pinyin: 0 };
  type ItemAgg = {
    table: string;
    id: string;
    key: string;
    classesByLang: Map<string, Set<T093Class>>;
  };
  const items = new Map<string, ItemAgg>();
  for (const f of report.findings) {
    if (f.lang !== "tr" && f.lang !== "en") continue;
    let cls: T093Class | null = null;
    if (f.class === "headword_missing") cls = "headword";
    else if (
      f.class === "script_contamination" &&
      f.detail?.severity === "foreign_script"
    )
      cls = "foreign";
    else if (
      f.class === "pinyin_mismatch" &&
      f.detail?.severity === "syllable_mismatch"
    ) {
      if (f.detail?.reading?.includes("/")) {
        // X/Y[readingX/readingY] alternation notation: a validator labeling
        // quirk, not a content defect (T-091 Result item 7). Explained residual.
        excludedAlternation++;
        continue;
      }
      cls = "pinyin";
    }
    if (!cls) continue;
    classBefore[cls]++;
    const itemKey = `${f.table}:${f.id}`;
    let agg = items.get(itemKey);
    if (!agg) {
      agg = { table: f.table, id: f.id, key: f.key, classesByLang: new Map() };
      items.set(itemKey, agg);
    }
    if (!agg.classesByLang.has(f.lang)) agg.classesByLang.set(f.lang, new Set());
    agg.classesByLang.get(f.lang)!.add(cls);
  }

  // Row metadata (headword forms, target language) straight from the live DB.
  const rowMeta = new Map<
    string,
    { kind: T093Kind; targetLanguage: string; word?: string; traditional?: string | null }
  >();
  for (const r of db.select().from(tables.vocabEntries).all())
    rowMeta.set(`vocab_entries:${r.id}`, {
      kind: "vocab",
      targetLanguage: r.targetLanguage,
      word: r.word,
      traditional: r.traditional,
    });
  for (const r of db.select().from(tables.kanjiEntries).all())
    rowMeta.set(`kanji_entries:${r.id}`, {
      kind: "kanji",
      targetLanguage: r.targetLanguage,
      word: r.char,
    });
  for (const r of db.select().from(tables.grammarTopics).all())
    rowMeta.set(`grammar_topics:${r.id}`, {
      kind: "grammar",
      targetLanguage: r.targetLanguage,
    });

  // Reading table for pinyin verification, same sources as the validator.
  const pairs: { word: string; reading: string }[] = db.$client
    .prepare("select word, reading from vocab_entries where target_language = 'zh'")
    .all() as never;
  const idxPath = path.join("src", "lib", "vocab-index", "zh-data.json");
  for (const e of JSON.parse(fs.readFileSync(idxPath, "utf8")))
    pairs.push({ word: e.word, reading: e.reading });
  const readingTable = buildReadingTable(pairs);

  type Unit = {
    kind: T093Kind;
    table: string;
    id: string;
    key: string;
    targetLanguage: string;
    langs: { lang: NativeLang; classes: Set<T093Class> }[];
    hasNonPinyin: boolean;
  };
  const units: Unit[] = [];
  let skippedMissingRow = 0;
  for (const agg of items.values()) {
    const meta = rowMeta.get(`${agg.table}:${agg.id}`);
    if (!meta) {
      skippedMissingRow++;
      continue;
    }
    const langs = [...agg.classesByLang.entries()]
      .filter(([lang]) => !ledger[`t093:${agg.table}:${agg.key}:${lang}`])
      .map(([lang, classes]) => ({ lang: lang as NativeLang, classes }));
    if (!langs.length) continue;
    units.push({
      kind: meta.kind,
      table: agg.table,
      id: agg.id,
      key: agg.key,
      targetLanguage: meta.targetLanguage,
      langs,
      hasNonPinyin: langs.some(
        (l) => l.classes.has("headword") || l.classes.has("foreign")
      ),
    });
  }
  // Mechanically-cheap-to-verify classes first (T-091 Result follow-up 1).
  units.sort((a, b) => Number(b.hasNonPinyin) - Number(a.hasNonPinyin));

  const totalHalves = units.reduce((n, u) => n + u.langs.length, 0);
  console.log(
    `RUN t093 items=${items.size} units-pending=${units.length} halves-pending=${totalHalves} ` +
      `conc=${concurrency} excluded-alternation-findings=${excludedAlternation} ` +
      `skipped-missing-row=${skippedMissingRow} ` +
      `class-findings before: headword=${classBefore.headword} foreign=${classBefore.foreign} pinyin=${classBefore.pinyin}`
  );

  let done = 0;
  let rerolls = 0;
  const verifyFailures: string[] = [];
  const logVerify = (entry: object) =>
    fs.appendFileSync(T093_VERIFY_LOG, JSON.stringify(entry) + "\n");

  const regenHalf = (u: Unit, lang: NativeLang) => {
    if (u.kind === "vocab") return generateVocabContent(db as never, gen, u.id, lang);
    if (u.kind === "kanji") return generateKanjiContent(db as never, gen, u.id, lang);
    return generateGrammarContent(db as never, gen, u.id, lang);
  };

  const freshHalf = (u: Unit, lang: NativeLang): unknown => {
    const t =
      u.kind === "vocab"
        ? tables.vocabEntries
        : u.kind === "kanji"
          ? tables.kanjiEntries
          : tables.grammarTopics;
    const row = db
      .select()
      .from(t)
      .where(eq((t as typeof tables.vocabEntries).id, u.id))
      .limit(1)
      .get();
    return normalizeLangContent<unknown>((row as { content?: unknown })?.content)[lang];
  };

  await runPool(units, async (u) => {
    const meta = rowMeta.get(`${u.table}:${u.id}`)!;
    for (const { lang, classes } of u.langs) {
      const key = `t093:${u.table}:${u.key}:${lang}`;
      const label = `${u.kind}:${u.key} (${lang})`;
      let verified = false;
      let attempts = 0;
      let lastProblems: string[] = [];
      while (attempts < T093_MAX_ATTEMPTS && !verified) {
        attempts++;
        const success = await attemptCall(label, () => regenHalf(u, lang));
        if (!success) return; // quota/transient/failure: unmarked, retried on relaunch
        const res = verifyHalf(freshHalf(u, lang), {
          classes,
          headword:
            u.kind === "grammar"
              ? undefined
              : { kind: u.kind, word: meta.word, traditional: meta.traditional },
          readingTable: u.targetLanguage === "zh" ? readingTable : undefined,
        }) as { pass: boolean; problems: string[] };
        verified = res.pass;
        lastProblems = res.problems;
        if (!verified && attempts < T093_MAX_ATTEMPTS) {
          rerolls++;
          console.log(
            `${ts()} REROLL ${label} attempt=${attempts} problems=${res.problems.length}: ${res.problems[0]?.slice(0, 120)}`
          );
        }
      }
      mark(key);
      done++;
      logVerify({
        key,
        attempts,
        pass: verified,
        problems: verified ? [] : lastProblems.slice(0, 5),
      });
      if (!verified) {
        verifyFailures.push(label);
        console.log(
          `${ts()} VERIFY-FAIL ${label} after ${attempts} attempts: ${lastProblems[0]?.slice(0, 160)}`
        );
      } else {
        console.log(`${ts()} OK ${label} attempts=${attempts} [${done}/${totalHalves}]`);
      }
    }
  });

  const summary = {
    targetsPath,
    items: items.size,
    unitsPending: units.length,
    halvesPending: totalHalves,
    halvesDone: done,
    rerolls,
    verifyFailures,
    excludedAlternationFindings: excludedAlternation,
    classFindingsBefore: classBefore,
    failures,
    transientSkipped,
    quotaExhausted,
  };
  fs.writeFileSync(T093_REPORT, JSON.stringify(summary, null, 2));
  console.log(
    `DONE t093 halves=${done}/${totalHalves} rerolls=${rerolls} verify-failures=${verifyFailures.length}`
  );
}

// ---------------------------------------------------------------------------
// Zod validation report, used for the checkpoint + close-out evidence.
// ---------------------------------------------------------------------------

async function validate(mode: "nl-grammar" | "criticals") {
  let okCount = 0;
  let failCount = 0;
  if (mode === "nl-grammar") {
    const topics = db
      .select()
      .from(tables.grammarTopics)
      .where(eq(tables.grammarTopics.targetLanguage, "nl"))
      .all();
    for (const t of topics) {
      const map = normalizeLangContent<unknown>(t.content);
      for (const lang of ["tr", "en"] as const) {
        const parsed = GrammarTopicSchema.safeParse(map[lang]);
        if (!parsed.success) {
          failCount++;
          console.log(`INVALID nl/${t.slug}/${lang}: ${parsed.error.issues[0]?.message}`);
          continue;
        }
        const badReading = parsed.data.examples.some((e) => e.reading != null);
        if (badReading) {
          failCount++;
          console.log(`READING-LEAK nl/${t.slug}/${lang}: reading not null`);
          continue;
        }
        okCount++;
      }
    }
  } else {
    const check = (
      label: string,
      content: unknown,
      schema: typeof GrammarTopicSchema | typeof KanjiContentSchema | typeof VocabContentSchema
    ) => {
      const parsed = (schema as { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } } }).safeParse(content);
      if (!parsed.success) {
        failCount++;
        console.log(`INVALID ${label}: ${parsed.error?.issues[0]?.message}`);
      } else okCount++;
    };
    for (const row of db
      .select()
      .from(tables.vocabEntries)
      .where(eq(tables.vocabEntries.targetLanguage, "zh"))
      .all()
      .filter((r) => ZH_VOCAB.includes(r.word))) {
      const map = normalizeLangContent<unknown>(row.content);
      check(`v:${row.word}/tr`, map.tr, VocabContentSchema);
      check(`v:${row.word}/en`, map.en, VocabContentSchema);
    }
    for (const row of db
      .select()
      .from(tables.kanjiEntries)
      .where(eq(tables.kanjiEntries.targetLanguage, "ja"))
      .all()
      .filter((r) => JA_KANJI.includes(r.char))) {
      const map = normalizeLangContent<unknown>(row.content);
      check(`k:${row.char}/tr`, map.tr, KanjiContentSchema);
      check(`k:${row.char}/en`, map.en, KanjiContentSchema);
    }
    for (const t of GRAMMAR_TOPICS) {
      const row = db
        .select()
        .from(tables.grammarTopics)
        .where(and(eq(tables.grammarTopics.targetLanguage, t.lang), eq(tables.grammarTopics.slug, t.slug)))
        .limit(1)
        .get()!;
      const map = normalizeLangContent<unknown>(row.content);
      check(`g:${t.lang}/${t.slug}/tr`, map.tr, GrammarTopicSchema);
      check(`g:${t.lang}/${t.slug}/en`, map.en, GrammarTopicSchema);
    }
  }
  console.log(`VALIDATE ok=${okCount} fail=${failCount}`);
}

// ---------------------------------------------------------------------------
// Per-item defect assertions against the T-023 audit findings (T-090
// acceptance: "the original defect verifiably gone"). Machine-checkable
// string tests over the regenerated payload, both tr and en where the
// finding named a language.
// ---------------------------------------------------------------------------

type Assertion = { item: string; defect: string; pass: boolean; detail?: string };

function jsonHay(content: unknown): string {
  return JSON.stringify(content ?? {});
}

async function verifyCriticals() {
  const results: Assertion[] = [];
  const push = (item: string, defect: string, pass: boolean, detail?: string) =>
    results.push({ item, defect, pass, detail });

  const getVocab = (word: string) =>
    normalizeLangContent<unknown>(
      db
        .select()
        .from(tables.vocabEntries)
        .where(and(eq(tables.vocabEntries.targetLanguage, "zh"), eq(tables.vocabEntries.word, word)))
        .limit(1)
        .get()?.content
    );
  const getKanji = (char: string) =>
    normalizeLangContent<unknown>(
      db
        .select()
        .from(tables.kanjiEntries)
        .where(and(eq(tables.kanjiEntries.targetLanguage, "ja"), eq(tables.kanjiEntries.char, char)))
        .limit(1)
        .get()?.content
    );
  const getGrammar = (lang: string, slug: string) =>
    normalizeLangContent<unknown>(
      db
        .select()
        .from(tables.grammarTopics)
        .where(and(eq(tables.grammarTopics.targetLanguage, lang), eq(tables.grammarTopics.slug, slug)))
        .limit(1)
        .get()?.content
    );

  {
    const c = getVocab("竟然");
    const hay = jsonHay(c.tr);
    push("v:竟然", "examples must contain 竟然, not 竢", hay.includes("竟然") && !hay.includes("竢"));
  }
  {
    const c = getVocab("脏");
    // Original defect is specific to the TR half: it taught ONLY zàng
    // "viscera" with no zāng "dirty" sense at all (en, separately, taught
    // only zāng). Check tr in isolation -- the tr half is the one T-090
    // names as broken.
    const hayTr = jsonHay(c.tr);
    push(
      "v:脏",
      "tr payload must teach the zāng \"dirty\" reading, not only zàng \"viscera\"",
      /zāng/.test(hayTr)
    );
  }
  {
    const c = getVocab("悬念");
    const hay = jsonHay(c.tr) + jsonHay(c.en);
    push(
      "v:悬念",
      "note_tr must carry no leaked tool-call markup",
      !/<parameter|<\/\w|\bnull\b\s*$/.test(hay)
    );
  }
  {
    const c = getVocab("惭愧");
    const hay = jsonHay(c.tr);
    push("v:惭愧", "must not gloss as terrified (ödü kopmak)", !hay.includes("ödü kopmak"));
  }
  {
    const c = getVocab("请示");
    const hay = jsonHay(c.tr);
    push(
      "v:请示",
      "must not invent 'başsağlığı (almak)' (condolences) as a meaning",
      !/başsağlığı/i.test(hay)
    );
  }
  {
    const c = getVocab("悔恨");
    const hay = jsonHay(c.tr);
    push("v:悔恨", "must not contain the hallucinated token 'enginiş'", !hay.includes("enginiş"));
  }
  {
    const c = getVocab("臂");
    const hay = jsonHay(c.en);
    push(
      "v:臂",
      "must not invent 'wing (of a bird)' sense or 鸟展开双臂飞向天空",
      !/wing \(of a bird\)/i.test(hay) && !hay.includes("鸟展开双臂飞向天空")
    );
  }
  {
    const c = getVocab("敬礼");
    const hay = jsonHay(c.tr);
    push("v:敬礼", "must not invent 'huīhuō' as a waving word", !hay.includes("huīhuō"));
  }
  {
    const c = getVocab("所以");
    const hay = jsonHay(c.en);
    push("v:所以", "must not present 就是所以 as idiomatic", !hay.includes("就是所以"));
  }
  {
    const c = getVocab("赔偿");
    const hay = jsonHay(c.tr);
    push(
      "v:赔偿",
      "meanings_tr must not gloss as karşılaştırmak (to compare)",
      !hay.includes("karşılaştırmak")
    );
  }
  {
    const c = getKanji("諒");
    const hay = jsonHay(c.tr) + jsonHay(c.en);
    const fabricated = ["容諒", "寛諒", "情諒", "嘉諒", "了諒"];
    push(
      "k:諒",
      "must not contain fabricated compounds " + fabricated.join(","),
      !fabricated.some((w) => hay.includes(w))
    );
  }
  {
    const c = getKanji("遇");
    const hay = jsonHay(c.tr) + jsonHay(c.en);
    push(
      "k:遇",
      "must not use 遇然 for ぐうぜん or 相遇 for そうぐう",
      !hay.includes("遇然") && !hay.includes("相遇")
    );
  }
  {
    const c = getKanji("鷹");
    const hay = jsonHay(c.tr) + jsonHay(c.en);
    push("k:鷹", "must not invent 目を鷹にする", !hay.includes("目を鷹にする"));
  }
  {
    const c = getKanji("啓");
    const hay = jsonHay(c.en);
    push("k:啓", "must not use Chinese 啓動 as a Japanese boot-up term", !hay.includes("啓動"));
  }
  {
    const c = getKanji("棺");
    const hay = jsonHay(c.en);
    push("k:棺", "must not use Chinese 棺材 with invented reading かんざい", !hay.includes("棺材"));
  }
  {
    const c = getKanji("朝");
    const hay = jsonHay(c.en);
    push("k:朝", "must not gloss 朝代 (Chinese) as the Japanese word for dynasty", !hay.includes("朝代"));
  }
  {
    const c = getKanji("苑");
    const parsed = KanjiContentSchema.safeParse(c.tr);
    const total = parsed.success ? parsed.data.examples.length : 0;
    const withChar = parsed.success ? parsed.data.examples.filter((e) => e.word.includes("苑")).length : 0;
    // Original defect: 6 of 6 examples used 園 instead of 苑, so the learner
    // never sees the taught character. Every example exists to show the
    // headword; the bar is ALL examples contain it, not merely one.
    push(
      "k:苑",
      "ALL tr examples must contain 苑 (not substitute 園)",
      parsed.success && total > 0 && withChar === total,
      `${withChar}/${total} examples contain 苑`
    );
  }
  {
    const c = getGrammar("ja", "koto-tote");
    const hay = jsonHay(c.tr) + jsonHay(c.en);
    push("g:ja/koto-tote", "must contain no Cyrillic corruption", !/[Ѐ-ӿ]/.test(hay));
  }
  {
    const c = getGrammar("ja", "nante-nanka");
    const hay = jsonHay(c.tr) + jsonHay(c.en);
    push(
      "g:ja/nante-nanka",
      "must not drop 嫌 or assign き reading to 大 (大[きら]いだ)",
      !hay.includes("大[きら]いだ")
    );
  }
  {
    const c = getGrammar("ja", "made-mo-nai");
    push(
      "g:ja/made-mo-nai",
      "en payload must not invert the までのことだ meaning ('matter too minor to bother with')",
      !jsonHay(c.en).toLowerCase().includes("too minor to bother")
    );
  }
  {
    const c = getGrammar("zh", "you-you");
    const hay = jsonHay(c.tr) + jsonHay(c.en);
    push(
      "g:zh/you-you",
      "pattern table must not mix English/bare pinyin into hanzi (又high又dà)",
      !hay.includes("又high又dà") && !/又high/.test(hay)
    );
  }
  {
    const c = getGrammar("zh", "tone-sandhi");
    const hay = jsonHay(c.tr) + jsonHay(c.en);
    push("g:zh/tone-sandhi", "must not teach the false 'yiǎng' sandhi rule", !/yiǎng/i.test(hay));
  }
  {
    const c = getGrammar("zh", "buzhiyu");
    const hay = jsonHay(c.tr) + jsonHay(c.en);
    push(
      "g:zh/buzhiyu",
      "must not fabricate a 不至于 + 于 + clause structure",
      !/不至于\s*\+?\s*于/.test(hay)
    );
  }
  {
    const c = getGrammar("fr", "interrogative-pronouns");
    const hay = jsonHay(c.tr) + jsonHay(c.en);
    // Original defect: any phrasing that tells the learner standard
    // "Que se passe-t-il ?" is wrong/unsayable ("you cannot say...",
    // "is incorrect", "n'est pas correct", ...) -- the negative verdict can
    // sit either before or after the quoted phrase, so search a window on
    // both sides rather than only forward.
    const badVerdict =
      /(cannot say|can't say|incorrect|not correct|inexact|is wrong|yanlış|hatalı|n'est pas correct)/i;
    const idx = hay.toLowerCase().indexOf("que se passe-t-il");
    const window = idx === -1 ? "" : hay.slice(Math.max(0, idx - 80), idx + 120);
    push(
      "g:fr/interrogative-pronouns",
      "must not declare 'Que se passe-t-il ?' incorrect/unsayable",
      idx === -1 || !badVerdict.test(window)
    );
  }
  {
    const c = getGrammar("fr", "agreement-advanced");
    const hay = jsonHay(c.en) + jsonHay(c.tr);
    push(
      "g:fr/agreement-advanced",
      "en intro must carry no leaked generation markup",
      !/<\/intro_tr>|<parameter/.test(hay)
    );
  }

  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"} ${r.item}: ${r.defect}${r.detail ? ` [${r.detail}]` : ""}`);
  }
  const passN = results.filter((r) => r.pass).length;
  console.log(`VERIFY-CRITICALS pass=${passN}/${results.length}`);
}

const mode = process.argv[2];
const t0 = Date.now();
async function main() {
  if (mode === "nl-grammar") await regenNlGrammar();
  else if (mode === "criticals") await regenCriticals();
  else if (mode === "t093") await regenT093();
  else if (mode === "validate-nl") return validate("nl-grammar");
  else if (mode === "validate-criticals") return validate("criticals");
  else if (mode === "verify-criticals") return verifyCriticals();
  else {
    console.error(
      "usage: regen-content.ts <nl-grammar|criticals|t093|validate-nl|validate-criticals|verify-criticals> " +
        "[--conc=N] [--max-conc=N] [--creep-min=N] [--targets=report.json]"
    );
    process.exit(2);
  }
  if (mode === "nl-grammar" || mode === "criticals") {
    await validate(mode === "nl-grammar" ? "nl-grammar" : "criticals");
    if (failures.length) {
      console.log(`UNRESOLVED (non-quota failures, retried on relaunch): ${failures.join(", ")}`);
    }
    if (transientSkipped.length) {
      console.log(
        `UNRESOLVED (transient rate-limit/overloaded, retried on relaunch): ${transientSkipped.join(", ")}`
      );
    }
    const wallSec = Math.round((Date.now() - t0) / 1000);
    console.log(
      `CONCURRENCY-SUMMARY start=${startConcurrency} min-seen=${minConcurrencySeen} end=${concurrency}` +
        (droppedToSerialNote ? ` note="${droppedToSerialNote}"` : "") +
        ` wall=${wallSec}s`
    );
    if (quotaExhausted) {
      console.log(`STOPPED-QUOTA-EXHAUSTED: ${quotaExhaustedDetail}`);
    }
  }
}

main()
  .then(() => process.exit(quotaExhausted ? 3 : 0))
  .catch((e) => {
    console.error("FATAL", e);
    process.exit(1);
  });
