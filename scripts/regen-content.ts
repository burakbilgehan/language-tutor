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
// Serial execution only (no pool/concurrency): every LLM call is awaited
// before the next starts. A resume ledger (data/regen-ledger.json, next to
// the DB) records completed units so a killed run can restart without
// redoing finished work or burning extra calls.
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

let stopRequested = false;
// Labels of halves that failed on a non-quota error and were NOT marked done
// in the ledger (a relaunch retries them). Surfaced in the final report as
// "anything unverified or skipped".
const failures: string[] = [];

/** Returns true only when `fn` actually completed the LLM call + write.
 * A quota hit stops the whole run (stopRequested); any OTHER error is
 * logged and swallowed so one bad call can't kill 143 already-serial
 * remaining calls -- but the caller must NOT mark the ledger key on
 * false, or a failed half would be permanently (and silently) skipped. */
async function attemptCall(label: string, fn: () => Promise<void>): Promise<boolean> {
  try {
    await fn();
    return true;
  } catch (e) {
    if (e instanceof LlmQuotaError) {
      stopRequested = true;
      console.log(`${ts()} QUOTA ${label}: ${(e.rawOutput ?? e.message).slice(0, 160)}`);
      return false;
    }
    failures.push(label);
    console.log(`${ts()} FAIL ${label}: ${(e as Error).message?.slice(0, 200)}`);
    return false;
  }
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

async function regenNlGrammar() {
  const gen = getProvider();
  const topics = db
    .select()
    .from(tables.grammarTopics)
    .where(eq(tables.grammarTopics.targetLanguage, "nl"))
    .orderBy(tables.grammarTopics.position)
    .all();
  console.log(`RUN nl-grammar total=${topics.length}`);
  let done = 0;
  for (const topic of topics) {
    if (stopRequested) break;
    for (const lang of ["tr", "en"] as NativeLang[]) {
      const key = `nl-grammar:${topic.slug}:${lang}`;
      if (ledger[key]) continue;
      if (stopRequested) break;
      const label = `${topic.slug} (${lang})`;
      const success = await attemptCall(label, () =>
        generateGrammarContent(db as never, gen, topic.id, lang)
      );
      if (!success) {
        if (stopRequested) break;
        continue; // non-quota failure: leave unmarked, retried on relaunch
      }
      mark(key);
      console.log(`${ts()} OK ${label}`);
    }
    // Null reading + flip status only once both halves exist this run OR
    // were already done in a prior run (ledger has both keys either way).
    if (ledger[`nl-grammar:${topic.slug}:tr`] && ledger[`nl-grammar:${topic.slug}:en`]) {
      const row = db
        .select()
        .from(tables.grammarTopics)
        .where(eq(tables.grammarTopics.id, topic.id))
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
        .where(eq(tables.grammarTopics.id, topic.id))
        .run();
      done++;
    }
  }
  console.log(`DONE nl-grammar topics-completed=${done}/${topics.length}`);
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
    `RUN criticals vocab=${vocabRows.length} kanji=${kanjiRows.length} grammar=${grammarRows.length}`
  );

  for (const row of vocabRows) {
    if (stopRequested) break;
    for (const lang of ["tr", "en"] as NativeLang[]) {
      const key = `vocab:${row.word}:${lang}`;
      if (ledger[key]) continue;
      if (stopRequested) break;
      const label = `v:${row.word} (${lang})`;
      const success = await attemptCall(label, () =>
        generateVocabContent(db as never, gen, row.id, lang)
      );
      if (!success) {
        if (stopRequested) break;
        continue;
      }
      mark(key);
      console.log(`${ts()} OK ${label}`);
    }
    if (ledger[`vocab:${row.word}:tr`] && ledger[`vocab:${row.word}:en`]) {
      db.update(tables.vocabEntries)
        .set({ status: "ready", generatedAt: new Date() })
        .where(eq(tables.vocabEntries.id, row.id))
        .run();
    }
  }

  for (const row of kanjiRows) {
    if (stopRequested) break;
    for (const lang of ["tr", "en"] as NativeLang[]) {
      const key = `kanji:${row.char}:${lang}`;
      if (ledger[key]) continue;
      if (stopRequested) break;
      const label = `k:${row.char} (${lang})`;
      const success = await attemptCall(label, () =>
        generateKanjiContent(db as never, gen, row.id, lang)
      );
      if (!success) {
        if (stopRequested) break;
        continue;
      }
      mark(key);
      console.log(`${ts()} OK ${label}`);
    }
    if (ledger[`kanji:${row.char}:tr`] && ledger[`kanji:${row.char}:en`]) {
      db.update(tables.kanjiEntries)
        .set({ status: "ready", generatedAt: new Date() })
        .where(eq(tables.kanjiEntries.id, row.id))
        .run();
    }
  }

  for (const row of grammarRows) {
    if (stopRequested) break;
    for (const lang of ["tr", "en"] as NativeLang[]) {
      const key = `grammar:${row.targetLanguage}/${row.slug}:${lang}`;
      if (ledger[key]) continue;
      if (stopRequested) break;
      const label = `g:${row.targetLanguage}/${row.slug} (${lang})`;
      const success = await attemptCall(label, () =>
        generateGrammarContent(db as never, gen, row.id, lang)
      );
      if (!success) {
        if (stopRequested) break;
        continue;
      }
      mark(key);
      console.log(`${ts()} OK ${label}`);
    }
    if (
      ledger[`grammar:${row.targetLanguage}/${row.slug}:tr`] &&
      ledger[`grammar:${row.targetLanguage}/${row.slug}:en`]
    ) {
      db.update(tables.grammarTopics)
        .set({ status: "ready", generatedAt: new Date() })
        .where(eq(tables.grammarTopics.id, row.id))
        .run();
    }
  }

  console.log("DONE criticals");
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
async function main() {
  if (mode === "nl-grammar") await regenNlGrammar();
  else if (mode === "criticals") await regenCriticals();
  else if (mode === "validate-nl") return validate("nl-grammar");
  else if (mode === "validate-criticals") return validate("criticals");
  else if (mode === "verify-criticals") return verifyCriticals();
  else {
    console.error(
      "usage: regen-content.ts <nl-grammar|criticals|validate-nl|validate-criticals|verify-criticals>"
    );
    process.exit(2);
  }
  if (mode === "nl-grammar" || mode === "criticals") {
    await validate(mode === "nl-grammar" ? "nl-grammar" : "criticals");
    if (failures.length) {
      console.log(`UNRESOLVED (non-quota failures, retried on relaunch): ${failures.join(", ")}`);
    }
  }
}

main()
  .then(() => process.exit(stopRequested ? 3 : 0))
  .catch((e) => {
    console.error("FATAL", e);
    process.exit(1);
  });
