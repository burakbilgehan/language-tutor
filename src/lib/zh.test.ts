import { test } from "node:test";
import assert from "node:assert/strict";
import { foldPinyin, answersMatchZh, hasHanzi } from "./zh";

test("foldPinyin strips tone marks, digits, spacing and folds ü/v", () => {
  assert.equal(foldPinyin("Nǐ hǎo!"), "nihao");
  assert.equal(foldPinyin("ni3 hao3"), "nihao");
  assert.equal(foldPinyin("nǚ"), "nu");
  assert.equal(foldPinyin("nv3"), "nu");
  assert.equal(foldPinyin("Wǒ shì xuésheng."), "woshixuesheng");
});

test("answersMatchZh: toneless pinyin matches toned", () => {
  assert.equal(answersMatchZh("nǐ hǎo", "ni hao"), true);
  assert.equal(answersMatchZh("wǒ shì", "wo3 shi4"), true);
  assert.equal(answersMatchZh("nǐ hǎo", "ni men hao"), false);
});

test("answersMatchZh: hanzi compares exactly, never via wanakana", () => {
  assert.equal(answersMatchZh("你好", "你好"), true);
  assert.equal(answersMatchZh("你好。", "你好"), true);
  // hanzi vs pinyin falls through to LLM grading — no deterministic match
  assert.equal(answersMatchZh("你好", "ni hao"), false);
});

test("hasHanzi", () => {
  assert.equal(hasHanzi("你好"), true);
  assert.equal(hasHanzi("ni hao"), false);
});
