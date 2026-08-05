/**
 * Deterministic seeded shuffle (T-078). LLM-generated mcq exercises almost
 * always place the correct answer first; this reorders options at render
 * time so learners can't pattern-match position instead of reading.
 *
 * The seed must be stable per exercise instance (same exercise id -> same
 * order on every re-render and after grading), but differ across exercises
 * so the bias doesn't just move from "always first" to "always second".
 */

/** FNV-1a: fast, deterministic, good-enough distribution for a UI shuffle. */
function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: small, fast PRNG seeded from a 32-bit int. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns a new array with `items` in a deterministic order derived from
 * `seed`. Same seed + same items -> same order, every time. Does not mutate
 * the input.
 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const result = items.slice();
  const rand = mulberry32(hashSeed(seed));
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
