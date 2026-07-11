import { test } from "node:test";
import assert from "node:assert/strict";
import {
  JLPT_ORDER,
  nextLevel,
  levelOrdinal,
  isJlptLevel,
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
