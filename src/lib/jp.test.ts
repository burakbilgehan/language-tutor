import { test } from "node:test";
import assert from "node:assert/strict";
import { answersMatch, parseFurigana, stripFurigana, hasJapanese } from "./jp";

test("romaji input matches kana answer", () => {
  assert.ok(answersMatch("こんにちは", "konnichiwa"));
  assert.ok(answersMatch("こんばんは", "konban wa"));
  assert.ok(answersMatch("おはよう", "ohayou"));
  assert.ok(answersMatch("ありがとう", "arigatou"));
});

test("kana input matches kana answer, katakana folds to hiragana", () => {
  assert.ok(answersMatch("こんにちは", "こんにちは"));
  assert.ok(answersMatch("コーヒー", "koohii"));
});

test("wrong romaji does not match", () => {
  assert.ok(!answersMatch("こんにちは", "konbanwa"));
  assert.ok(!answersMatch("あ", "i"));
});

test("particle spellings fold (は/wa, を/o, へ/e)", () => {
  assert.ok(answersMatch("わたしは がくせい です", "watashi wa gakusei desu"));
});

test("non-Japanese answers use plain compare", () => {
  assert.ok(answersMatch("Günaydın", "günaydın"));
  assert.ok(answersMatch("Merhaba!", "merhaba"));
  assert.ok(!answersMatch("Günaydın", "İyi akşamlar"));
});

test("comma/space variants match", () => {
  assert.ok(answersMatch("a, i, u, e, o", "a,i,u,e,o"));
  assert.ok(answersMatch("a, i, u, e, o", "aiueo"));
  assert.ok(answersMatch("aiueo", "a, i, u, e, o"));
  assert.ok(!answersMatch("a, i, u, e, o", "a, i, u, o, e"));
});

test("Turkish diacritics fold to ASCII", () => {
  assert.ok(answersMatch("hayır", "hayir"));
  assert.ok(answersMatch("aşağı", "asagi"));
  assert.ok(answersMatch("yukarı", "yukari"));
  assert.ok(answersMatch("güle güle", "gule gule"));
  assert.ok(answersMatch("çiçek", "cicek"));
  assert.ok(answersMatch("öğretmen", "ogretmen"));
  // Uppercase dotted/dotless İ/I via tr locale lowering.
  assert.ok(answersMatch("İyi", "iyi"));
  assert.ok(!answersMatch("hayır", "evet"));
});

test("furigana parsing and stripping", () => {
  const segs = parseFurigana("私[わたし]は学生[がくせい]です");
  assert.deepEqual(segs, [
    { text: "私", reading: "わたし" },
    { text: "は" },
    { text: "学生", reading: "がくせい" },
    { text: "です" },
  ]);
  assert.equal(stripFurigana("私[わたし]は学生[がくせい]です"), "私は学生です");
  assert.equal(stripFurigana("furigana yok"), "furigana yok");
});

test("furigana: whole-word readings with okurigana", () => {
  // The LLM also emits readings covering kanji + trailing okurigana; these
  // used to fail the regex entirely, rendering raw brackets and making the
  // TTS speak both the kanji and its reading.
  assert.deepEqual(parseFurigana("すしを 三つ[みっつ] ください。"), [
    { text: "すしを " },
    { text: "三つ", reading: "みっつ" },
    { text: " ください。" },
  ]);
  assert.equal(stripFurigana("すしを 三つ[みっつ] ください。"), "すしを 三つ ください。");
  assert.deepEqual(parseFurigana("食べる[たべる]"), [
    { text: "食べる", reading: "たべる" },
  ]);
  // Unbracketed kanji before the annotated word must not be swallowed into
  // the base: only 本 carries the reading here.
  assert.deepEqual(parseFurigana("駅で本[ほん]を"), [
    { text: "駅で" },
    { text: "本", reading: "ほん" },
    { text: "を" },
  ]);
});

test("hasJapanese detection", () => {
  assert.ok(hasJapanese("こんにちは"));
  assert.ok(hasJapanese("日本"));
  assert.ok(!hasJapanese("konnichiwa"));
});
