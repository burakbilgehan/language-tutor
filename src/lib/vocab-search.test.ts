import { test } from "node:test";
import assert from "node:assert/strict";
import { rankVocab } from "./vocab-search";
import { ZH_VOCAB_INDEX } from "./vocab-index/zh";
import type { VocabEntrySummary } from "./client-api";

// Guards the ranking layers of rankVocab (the ja dictionary was removed, but
// the language-aware fold + gloss-quality subscore remain and serve zh).
const shape = (idx: typeof ZH_VOCAB_INDEX): VocabEntrySummary[] =>
  idx.map((v) => ({
    word: v.word,
    reading: v.reading,
    meaningsEn: v.en,
    level: v.level,
    status: "pending" as const,
  }));

const zh = shape(ZH_VOCAB_INDEX);

const rank = (rows: VocabEntrySummary[], q: string, word: string) =>
  rankVocab(rows, q).findIndex((r) => r.word === word);

test("rankVocab zh: reading + hanzi + gloss layers", () => {
  assert.equal(rank(zh, "马", "马"), 0, "hanzi exact → #0");
  // reading-exact syllable layer (the space-split path the fold refactor touched)
  const maRank = rank(zh, "ma", "马");
  assert.ok(maRank >= 0 && maRank <= 5, "ma near top");
  assert.equal(rank(zh, "pengyou", "朋友"), 0, "multi-syllable pinyin reading");
  assert.equal(rank(zh, "horse", "马"), 0, "exact-gloss quality subscore → #0");
});
