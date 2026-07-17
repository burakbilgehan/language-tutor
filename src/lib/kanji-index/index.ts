import { JA_KANJI_INDEX, type KanjiIndexEntry } from "./ja";

export type { KanjiIndexEntry };

export function kanjiIndexFor(targetLanguage: string): KanjiIndexEntry[] {
  switch (targetLanguage) {
    case "ja":
      return JA_KANJI_INDEX;
    default:
      return [];
  }
}
