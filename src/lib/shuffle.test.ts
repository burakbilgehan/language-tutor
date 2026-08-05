import { test } from "node:test";
import assert from "node:assert/strict";
import { nanoid } from "nanoid";
import { seededShuffle } from "./shuffle";

test("same seed -> same order, every call", () => {
  const items = ["A option", "B option", "C option", "D option"];
  const first = seededShuffle(items, "exercise-123");
  for (let i = 0; i < 20; i++) {
    assert.deepEqual(seededShuffle(items, "exercise-123"), first);
  }
});

test("different seeds tend to produce different orders", () => {
  const items = ["A", "B", "C", "D", "E", "F"];
  const orders = new Set(
    Array.from({ length: 10 }, (_, i) =>
      seededShuffle(items, `exercise-${i}`).join("|")
    )
  );
  // Not every seed must differ (birthday collisions are fine), but they
  // should not all collapse to the same order.
  assert.ok(orders.size > 1, "expected multiple distinct orders across seeds");
});

test("does not mutate the input array", () => {
  const items = ["A", "B", "C"];
  const original = [...items];
  seededShuffle(items, "some-seed");
  assert.deepEqual(items, original);
});

test("preserves the full set of items (no drops, no dupes)", () => {
  const items = ["A", "B", "C", "D", "E"];
  const shuffled = seededShuffle(items, "seed-xyz");
  assert.deepEqual([...shuffled].sort(), [...items].sort());
  assert.equal(shuffled.length, items.length);
});

test("selected option text survives shuffling unchanged (grading contract)", () => {
  // T-078: grading compares the selected option's TEXT against `answer`.
  // Shuffling must never alter the option strings themselves, only order.
  const options = ["correct answer", "wrong 1", "wrong 2", "wrong 3"];
  const answer = "correct answer";
  const shuffled = seededShuffle(options, "exercise-456");
  assert.ok(shuffled.includes(answer));
  assert.equal(
    shuffled.find((o) => o === answer),
    answer
  );
});

test("distributes the correct answer roughly evenly across slots over many real exercise ids", () => {
  // T-078's actual problem: LLM output almost always has the answer at
  // index 0. Real exercise ids are nanoid() (src/core/llm-gen.ts), so seed
  // with real nanoids, not toy strings like "exercise-0" that could share a
  // pathological prefix/suffix correlation with the hash+PRNG.
  const options = ["correct", "wrong-1", "wrong-2", "wrong-3"];
  const slotCounts = [0, 0, 0, 0];
  const trials = 4000;
  for (let i = 0; i < trials; i++) {
    const shuffled = seededShuffle(options, nanoid());
    slotCounts[shuffled.indexOf("correct")]++;
  }
  const expected = trials / options.length;
  for (const count of slotCounts) {
    // Allow generous slack (each slot within +/-40% of uniform) — this is
    // a sanity check against gross positional bias, not a strict
    // uniformity test.
    assert.ok(
      count > expected * 0.6 && count < expected * 1.4,
      `slot distribution too skewed: ${JSON.stringify(slotCounts)}`
    );
  }
});

test("handles 0 and 1 item inputs without throwing", () => {
  assert.deepEqual(seededShuffle([], "seed"), []);
  assert.deepEqual(seededShuffle(["only"], "seed"), ["only"]);
});

test("empty seed string still produces a deterministic, stable order", () => {
  const items = ["A", "B", "C"];
  const a = seededShuffle(items, "");
  const b = seededShuffle(items, "");
  assert.deepEqual(a, b);
});
