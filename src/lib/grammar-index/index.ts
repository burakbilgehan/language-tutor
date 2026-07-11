import { JA_GRAMMAR_INDEX, type GrammarIndexEntry } from "./ja";
import { NL_GRAMMAR_INDEX } from "./nl";

export type { GrammarIndexEntry };

export function grammarIndexFor(targetLanguage: string): GrammarIndexEntry[] {
  switch (targetLanguage) {
    case "ja":
      return JA_GRAMMAR_INDEX;
    case "nl":
      return NL_GRAMMAR_INDEX;
    default:
      return [];
  }
}
