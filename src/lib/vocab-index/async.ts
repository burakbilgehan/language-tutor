import type { VocabIndexEntry } from "./zh";

export type { VocabIndexEntry };

// Async, per-language dynamic import (T-037). Used by search-index.ts /
// CommandPalette so a profile whose target language has no vocab dictionary
// (nl, and ja since T-030's revert) never pulls zh-data.json into its
// first-load JS — only the active profile's language chunk loads, on demand.
//
// Deliberately its own module, separate from "./index" (the sync
// vocabIndexFor used by server/core code): if both lived in one file,
// webpack would see "./zh" already statically imported for the sync path
// and inline it, defeating this dynamic import().
export async function vocabIndexForAsync(
  targetLanguage: string,
): Promise<VocabIndexEntry[]> {
  switch (targetLanguage) {
    case "zh": {
      const { ZH_VOCAB_INDEX } = await import("./zh");
      return ZH_VOCAB_INDEX;
    }
    default:
      return [];
  }
}
