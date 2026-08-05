import { test } from "node:test";
import assert from "node:assert/strict";
import { ttsLangTag, speakableText, ttsRateFor } from "./tts";

test("ttsLangTag maps known target languages to BCP-47 voice tags", () => {
  assert.equal(ttsLangTag("ja"), "ja-JP");
  assert.equal(ttsLangTag("zh"), "zh-CN");
  assert.equal(ttsLangTag("nl"), "nl-NL");
  assert.equal(ttsLangTag("fr"), "fr-FR");
  assert.equal(ttsLangTag("en"), "en-US");
});

test("ttsLangTag returns null for unknown/missing target language", () => {
  assert.equal(ttsLangTag("xx"), null);
  assert.equal(ttsLangTag(null), null);
  assert.equal(ttsLangTag(undefined), null);
  assert.equal(ttsLangTag(""), null);
});

test("speakableText strips furigana readings, speaks base text only", () => {
  assert.equal(speakableText("漢字[かんじ]"), "漢字");
  assert.equal(speakableText("私[わたし]は日本語[にほんご]を勉強[べんきょう]します"), "私は日本語を勉強します");
});

test("speakableText strips pinyin readings", () => {
  assert.equal(speakableText("学生[xuésheng]"), "学生");
  assert.equal(speakableText("我[wǒ]是[shì]学生[xuésheng]"), "我是学生");
});

test("speakableText leaves unbracketed text untouched", () => {
  assert.equal(speakableText("Hallo, hoe gaat het?"), "Hallo, hoe gaat het?");
  assert.equal(speakableText("Bonjour"), "Bonjour");
});

test("speakableText collapses stray whitespace and trims", () => {
  assert.equal(speakableText("  こんにちは   世界  "), "こんにちは 世界");
});

test("speakableText handles empty input", () => {
  assert.equal(speakableText(""), "");
  assert.equal(speakableText("   "), "");
});

test("ttsRateFor slows zh down for tone clarity, others read at a relaxed pace", () => {
  assert.equal(ttsRateFor("zh-CN"), 0.65);
  assert.equal(ttsRateFor("ja-JP"), 0.85);
  assert.equal(ttsRateFor("nl-NL"), 0.85);
  assert.equal(ttsRateFor("fr-FR"), 0.85);
  assert.equal(ttsRateFor(null), 0.85);
  assert.equal(ttsRateFor(undefined), 0.85);
});
