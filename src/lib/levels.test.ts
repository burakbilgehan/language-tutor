import { test } from "node:test";
import assert from "node:assert/strict";
import {
  JLPT_ORDER,
  HSK_ORDER,
  CEFR_ORDER,
  nextLevel,
  levelOrdinal,
  isJlptLevel,
  schemeFor,
  firstLevel,
  isLevelOf,
  levelOrdinalFor,
  nextLevelFor,
  levelDisplay,
  remapLegacyLevel,
} from "./curriculum/levels";

test("JLPT_ORDER is easiest → hardest", () => {
  assert.deepEqual([...JLPT_ORDER], ["N5", "N4", "N3", "N2", "N1"]);
});

test("nextLevel walks up the ladder", () => {
  assert.equal(nextLevel("N5"), "N4");
  assert.equal(nextLevel("N4"), "N3");
  assert.equal(nextLevel("N3"), "N2");
  assert.equal(nextLevel("N2"), "N1");
});

test("nextLevel(N1) is null — the terminal", () => {
  assert.equal(nextLevel("N1"), null);
});

test("levelOrdinal", () => {
  assert.equal(levelOrdinal("N5"), 0);
  assert.equal(levelOrdinal("N1"), 4);
});

test("isJlptLevel guards", () => {
  assert.equal(isJlptLevel("N3"), true);
  assert.equal(isJlptLevel("N0"), false);
  assert.equal(isJlptLevel("garbage"), false);
});

test("scheme registry: ja=JLPT, zh=HSK, nl and unknown languages=CEFR", () => {
  assert.equal(schemeFor("ja").name, "JLPT");
  assert.deepEqual([...schemeFor("zh").levels], [...HSK_ORDER]);
  assert.equal(schemeFor("nl").name, "CEFR");
  assert.deepEqual([...schemeFor("ko").levels], [...CEFR_ORDER]);
});

test("firstLevel per scheme", () => {
  assert.equal(firstLevel("ja"), "N5");
  assert.equal(firstLevel("zh"), "HSK1");
  assert.equal(firstLevel("nl"), "A1");
});

test("isLevelOf rejects other schemes' levels", () => {
  assert.equal(isLevelOf("ja", "N3"), true);
  assert.equal(isLevelOf("ja", "HSK3"), false);
  assert.equal(isLevelOf("zh", "HSK6"), true);
  assert.equal(isLevelOf("zh", "N5"), false);
  assert.equal(isLevelOf("nl", "B1"), true);
  assert.equal(isLevelOf("nl", "N5"), false);
});

test("levelOrdinalFor / nextLevelFor walk each scheme", () => {
  assert.equal(levelOrdinalFor("zh", "HSK1"), 0);
  assert.equal(levelOrdinalFor("zh", "N5"), -1);
  assert.equal(nextLevelFor("zh", "HSK5"), "HSK6");
  assert.equal(nextLevelFor("zh", "HSK6"), null);
  assert.equal(nextLevelFor("nl", "A1"), "A2");
  assert.equal(nextLevelFor("nl", "C2"), null);
  assert.equal(nextLevelFor("ja", "N2"), "N1");
});

test("levelDisplay labels", () => {
  assert.equal(levelDisplay("ja", "N5"), "JLPT N5");
  assert.equal(levelDisplay("zh", "HSK3"), "HSK 3");
  assert.equal(levelDisplay("nl", "B2"), "CEFR B2");
});

test("remapLegacyLevel maps faked JLPT levels onto the real scheme by ordinal", () => {
  assert.equal(remapLegacyLevel("nl", "N5"), "A1");
  assert.equal(remapLegacyLevel("nl", "N4"), "A2");
  assert.equal(remapLegacyLevel("nl", "N3"), "B1");
  assert.equal(remapLegacyLevel("zh", "N5"), "HSK1");
  // Already valid or unmappable strings pass through untouched.
  assert.equal(remapLegacyLevel("nl", "B2"), "B2");
  assert.equal(remapLegacyLevel("nl", "garbage"), "garbage");
  assert.equal(remapLegacyLevel("ja", "N4"), "N4");
});
