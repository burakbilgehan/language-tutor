import { test } from "node:test";
import assert from "node:assert/strict";
import { review, type SrsState } from "./srs";

const fresh: SrsState = {
  easeFactor: 2.5,
  intervalDays: 0,
  repetitions: 0,
  lapses: 0,
};
const now = new Date("2026-07-11T12:00:00Z");

test("good on a fresh card → 1 day", () => {
  const r = review(fresh, 2, now);
  assert.equal(r.intervalDays, 1);
  assert.equal(r.repetitions, 1);
  assert.equal(r.dueAt.getTime(), now.getTime() + 86_400_000);
});

test("second good → 3 days, third good → interval * EF", () => {
  let r = review(fresh, 2, now);
  r = review(r, 2, now);
  assert.equal(r.intervalDays, 3);
  const third = review(r, 2, now);
  assert.equal(third.intervalDays, 3 * r.easeFactor);
});

test("again resets repetitions, bumps lapses, ~10min due, EF floor holds", () => {
  const state: SrsState = { easeFactor: 1.35, intervalDays: 20, repetitions: 5, lapses: 0 };
  const r = review(state, 0, now);
  assert.equal(r.repetitions, 0);
  assert.equal(r.lapses, 1);
  assert.equal(r.easeFactor, 1.3); // floored, not 1.15
  assert.equal(r.dueAt.getTime(), now.getTime() + 600_000);
});

test("hard grows slowly and reduces EF", () => {
  const state: SrsState = { easeFactor: 2.5, intervalDays: 10, repetitions: 3, lapses: 0 };
  const r = review(state, 1, now);
  assert.equal(r.intervalDays, 12);
  assert.equal(r.easeFactor, 2.35);
});

test("easy grows fast and increases EF", () => {
  const state: SrsState = { easeFactor: 2.5, intervalDays: 10, repetitions: 3, lapses: 0 };
  const r = review(state, 3, now);
  assert.equal(r.easeFactor, 2.65);
  assert.ok(r.intervalDays > 30);
});

test("interval is capped at 365 days", () => {
  const state: SrsState = { easeFactor: 2.5, intervalDays: 300, repetitions: 9, lapses: 0 };
  const r = review(state, 3, now);
  assert.equal(r.intervalDays, 365);
});
