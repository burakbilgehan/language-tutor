import { ZH_VOCAB_INDEX, type VocabIndexEntry } from "./zh";
import { JA_VOCAB_INDEX } from "./ja";

export type { VocabIndexEntry };

export function vocabIndexFor(targetLanguage: string): VocabIndexEntry[] {
  switch (targetLanguage) {
    case "zh":
      return ZH_VOCAB_INDEX;
    case "ja":
      return JA_VOCAB_INDEX;
    default:
      return [];
  }
}
