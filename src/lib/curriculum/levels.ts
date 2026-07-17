// Single source of truth for curriculum level ordering, per target language.
// Learning order is always easiest → hardest (index 0 = first chapter).
// Level strings are stored verbatim in curriculum_chapters.level / units.level
// and in GrammarIndexEntry.level, so grammar and curriculum stay aligned.
//
// Schemes: Japanese uses JLPT (N5→N1), Chinese uses HSK (1→6), everything
// else defaults to CEFR (A1→C2). Level strings are globally unique across
// schemes ("N5" vs "HSK1" vs "A1"), so a flat string namespace is safe.

export const JLPT_ORDER = ["N5", "N4", "N3", "N2", "N1"] as const;
export type JlptLevel = (typeof JLPT_ORDER)[number];

export const HSK_ORDER = [
  "HSK1",
  "HSK2",
  "HSK3",
  "HSK4",
  "HSK5",
  "HSK6",
] as const;
export type HskLevel = (typeof HSK_ORDER)[number];

export const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_ORDER)[number];

export interface LevelScheme {
  /** Scale name for prompts/UI ("JLPT", "HSK", "CEFR"). */
  name: string;
  levels: readonly string[];
}

const CEFR_SCHEME: LevelScheme = { name: "CEFR", levels: CEFR_ORDER };

// Any language without an explicit entry falls back to CEFR — the scheme
// virtually every non-CJK language test maps onto.
const LEVEL_SCHEMES: Record<string, LevelScheme> = {
  ja: { name: "JLPT", levels: JLPT_ORDER },
  zh: { name: "HSK", levels: HSK_ORDER },
  nl: CEFR_SCHEME,
};

export function schemeFor(targetLanguage: string): LevelScheme {
  return LEVEL_SCHEMES[targetLanguage] ?? CEFR_SCHEME;
}

export function firstLevel(targetLanguage: string): string {
  return schemeFor(targetLanguage).levels[0];
}

export function isLevelOf(targetLanguage: string, v: string): boolean {
  return schemeFor(targetLanguage).levels.includes(v);
}

/** Index within the language's scheme, or -1 if the string isn't a level of it. */
export function levelOrdinalFor(targetLanguage: string, level: string): number {
  return schemeFor(targetLanguage).levels.indexOf(level);
}

/** Next harder level in the language's scheme, or null at the top (terminal). */
export function nextLevelFor(
  targetLanguage: string,
  level: string
): string | null {
  const levels = schemeFor(targetLanguage).levels;
  const i = levels.indexOf(level);
  if (i < 0 || i >= levels.length - 1) return null;
  return levels[i + 1];
}

/** Human label for prompts/UI: "JLPT N5", "HSK 3", "CEFR A1". */
export function levelDisplay(targetLanguage: string, level: string): string {
  const scheme = schemeFor(targetLanguage);
  if (level.startsWith(scheme.name)) {
    // "HSK3" → "HSK 3"
    return `${scheme.name} ${level.slice(scheme.name.length)}`;
  }
  return `${scheme.name} ${level}`;
}

// ---- JLPT-specific helpers ----
// Kept for Japanese-only surfaces (kanji index/routes, stroke trainer) and
// legacy data handling; curriculum flow should use the *For variants above.

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

/**
 * Legacy remap: before per-language schemes, every language reused JLPT
 * levels ("N5"≈A1 for Dutch). Maps such a stored level onto the language's
 * real scheme by ordinal; returns the input unchanged when it's already
 * valid (or unmappable). Used by the lazy chapter/unit self-heal.
 */
export function remapLegacyLevel(
  targetLanguage: string,
  stored: string
): string {
  if (isLevelOf(targetLanguage, stored)) return stored;
  if (!isJlptLevel(stored)) return stored;
  const levels = schemeFor(targetLanguage).levels;
  return levels[Math.min(levelOrdinal(stored), levels.length - 1)];
}
