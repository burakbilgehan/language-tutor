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

test("hasJapanese detection", () => {
  assert.ok(hasJapanese("こんにちは"));
  assert.ok(hasJapanese("日本"));
  assert.ok(!hasJapanese("konnichiwa"));
});
