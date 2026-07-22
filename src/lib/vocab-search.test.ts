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
  assert.ok(rank(ja, "horse", "馬") >= 0, "english gloss finds it");
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
