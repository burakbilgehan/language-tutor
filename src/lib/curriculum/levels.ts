// Single source of truth for JLPT level ordering (curriculum chapters).
// Learning order is easiest → hardest, i.e. the REVERSE of the numeric names.
// Uses the same "N5".."N1" vocabulary as GrammarIndexEntry.level so grammar
// and curriculum stay aligned.

export const JLPT_ORDER = ["N5", "N4", "N3", "N2", "N1"] as const;
export type JlptLevel = (typeof JLPT_ORDER)[number];

export function isJlptLevel(v: string): v is JlptLevel {
  return (JLPT_ORDER as readonly string[]).includes(v);
}

export function levelOrdinal(level: JlptLevel): number {
  return JLPT_ORDER.indexOf(level);
}

/** Next harder level, or null at N1 (the "curriculum complete" terminal). */
export function nextLevel(level: JlptLevel): JlptLevel | null {
  const i = JLPT_ORDER.indexOf(level);
  if (i < 0 || i >= JLPT_ORDER.length - 1) return null;
  return JLPT_ORDER[i + 1];
}
