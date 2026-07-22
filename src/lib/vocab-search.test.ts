import { test } from "node:test";
import assert from "node:assert/strict";
import { rankVocab } from "./vocab-search";
import { JA_VOCAB_INDEX } from "./vocab-index/ja";
import { ZH_VOCAB_INDEX } from "./vocab-index/zh";
import type { VocabEntrySummary } from "./client-api";

// Guards the unicode-fragile bits: hasKana ranges (vocab-search) and the
// codepoint escapes in foldJaReading (search-index). A ja entry must be found
// via all three query scripts, and zh ranking must not regress.
const shape = (idx: typeof JA_VOCAB_INDEX): VocabEntrySummary[] =>
  idx.map((v) => ({
    word: v.word,
    reading: v.reading,
    meaningsEn: v.en,
    level: v.level,
    status: "pending" as const,
  }));

const ja = shape(JA_VOCAB_INDEX);
const zh = shape(ZH_VOCAB_INDEX);

const rank = (rows: VocabEntrySummary[], q: string, word: string) =>
  rankVocab(rows, q).findIndex((r) => r.word === word);

test("rankVocab ja: uma / 馬 / horse all surface 馬", () => {
  assert.equal(rank(ja, "uma", "馬"), 0, "romaji query hits reading");
  assert.equal(rank(ja, "馬", "馬"), 0, "kanji query hits word");
  // T-030 defect 4: "horse" used to rank 馬 7th behind 引く/青/穴 whose long
  // gloss walls happened to contain a "horse" token. Sense-aware capping +
  // the gloss-word quality subscore (exact-gloss > earlier-position > shorter)
  // must put 馬 (gloss[0]="horse") first.
  assert.equal(rank(ja, "horse", "馬"), 0, "exact-gloss ranks 馬 #1");
});

test("rankVocab ja: gloss subscore — exact/leading gloss beats deep mention", () => {
  // Within the gloss tier, 太陽[Sun] and 日[sun] (the words FOR the sun) must
  // lead over entries that only mention "sun" deeper in a longer gloss, and
  // "Sunday" (日曜日) must never beat a "sun" gloss — it's a different token,
  // so it doesn't match "sun" at all.
  const sunRanked = rankVocab(ja, "sun");
  const sunGlossHits = sunRanked.filter((r) =>
    r.meaningsEn.some((g) => /\b(sun|sunday)\b/i.test(g))
  );
  const first = sunGlossHits[0]?.word;
  assert.ok(
    first === "太陽" || first === "日",
    `sun-gloss tier leads with 太陽/日, got ${first}`
  );
  const taiyou = sunGlossHits.findIndex((r) => r.word === "太陽");
  const sunday = sunGlossHits.findIndex((r) => r.word === "日曜日");
  assert.ok(taiyou >= 0, "太陽 present in sun gloss hits");
  assert.ok(
    sunday === -1 || sunday > taiyou,
    "Sunday never outranks a sun gloss"
  );
});

test("rankVocab ja: kana query 食べる → 食べる", () => {
  assert.equal(rank(ja, "たべる", "食べる"), 0, "kana reading exact");
  assert.equal(rank(ja, "taberu", "食べる"), 0, "romaji of the same reading");
});

test("rankVocab zh no-regression: reading + hanzi + gloss layers", () => {
  assert.equal(rank(zh, "马", "马"), 0, "hanzi exact → #0");
  // reading-exact syllable layer (the space-split path the fold refactor touched)
  const maRank = rank(zh, "ma", "马");
  assert.ok(maRank >= 0 && maRank <= 5, "ma near top");
  assert.equal(rank(zh, "pengyou", "朋友"), 0, "multi-syllable pinyin reading");
  assert.ok(rank(zh, "horse", "马") >= 0, "english gloss finds it");
});
