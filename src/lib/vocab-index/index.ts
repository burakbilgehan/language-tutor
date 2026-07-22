import { ZH_VOCAB_INDEX, type VocabIndexEntry } from "./zh";

export type { VocabIndexEntry };

export function vocabIndexFor(targetLanguage: string): VocabIndexEntry[] {
  switch (targetLanguage) {
    case "zh":
      return ZH_VOCAB_INDEX;
    default:
      return [];
  }
}
