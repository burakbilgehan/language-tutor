import type { Conjugator } from "./types";
import { conjugateJa, guessClassJa, JA_PRESETS, JA_WORD_CLASSES } from "./ja";

export type {
  ConjForm,
  ConjGroup,
  ConjInput,
  ConjPreset,
  ConjResult,
  Conjugator,
  JaWordClass,
} from "./types";

const JA: Conjugator = {
  conjugate: conjugateJa,
  guessClass: guessClassJa,
  presets: JA_PRESETS,
  wordClasses: JA_WORD_CLASSES,
};

/**
 * Per-language conjugator seam (grammarIndexFor pattern). ja is the only
 * implementation; nl (weak/strong verbs) can slot in later. zh has no
 * conjugation — an aspect-particle reference would be a separate static
 * component, not this interface.
 */
export function conjugatorFor(targetLanguage: string): Conjugator | null {
  return targetLanguage === "ja" ? JA : null;
}
