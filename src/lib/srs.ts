// SM-2 variant with 4 ratings: 0 again | 1 hard | 2 good | 3 easy.
// Pure functions — no DB, unit-tested in srs.test.ts.

export interface SrsState {
  easeFactor: number; // >= 1.3
  intervalDays: number; // 0 = learning
  repetitions: number;
  lapses: number;
}

export interface SrsResult extends SrsState {
  dueAt: Date;
}

export type Rating = 0 | 1 | 2 | 3;

const MIN_EF = 1.3;
const AGAIN_DELAY_MS = 10 * 60 * 1000; // relearn in 10 minutes

export function review(state: SrsState, rating: Rating, now = new Date()): SrsResult {
  let { easeFactor, intervalDays, repetitions, lapses } = state;

  switch (rating) {
    case 0: // again
      easeFactor = Math.max(MIN_EF, easeFactor - 0.2);
      repetitions = 0;
      intervalDays = 0;
      lapses += 1;
      return {
        easeFactor,
        intervalDays,
        repetitions,
        lapses,
        dueAt: new Date(now.getTime() + AGAIN_DELAY_MS),
      };

    case 1: // hard
      easeFactor = Math.max(MIN_EF, easeFactor - 0.15);
      intervalDays = intervalDays < 1 ? 1 : intervalDays * 1.2;
      repetitions += 1;
      break;

    case 2: // good
      if (repetitions === 0) intervalDays = 1;
      else if (repetitions === 1) intervalDays = 3;
      else intervalDays = intervalDays * easeFactor;
      repetitions += 1;
      break;

    case 3: // easy
      easeFactor += 0.15;
      if (repetitions === 0) intervalDays = 2;
      else if (repetitions === 1) intervalDays = 5;
      else intervalDays = intervalDays * easeFactor * 1.3;
      repetitions += 1;
      break;
  }

  intervalDays = Math.min(intervalDays, 365);
  return {
    easeFactor,
    intervalDays,
    repetitions,
    lapses,
    dueAt: new Date(now.getTime() + intervalDays * 86_400_000),
  };
}
