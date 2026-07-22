import { ZH_VOCAB_INDEX, type VocabIndexEntry } from "./zh";

export type { VocabIndexEntry };

// Sync — used by server/core code (ensureVocabSeeded runs inside a
// db.transaction, which cannot await). zh-data.json (~700 KB) statically
// imported via ./zh; fine server-side (never shipped to the client), and in
// browser-static mode src/core/vocab.ts is already behind a dynamic
// import() (see client-api.ts), so this never lands in the browser's
// first-load JS either.
//
// Client-side code that only needs the index for search (CommandPalette)
// MUST use vocabIndexForAsync from "@/lib/vocab-index/async" instead — kept
// in a SEPARATE module on purpose. If the async loader lived in this same
// file, webpack would see "./zh" already statically imported here and
// inline it into whatever chunk reaches this file, silently defeating the
// dynamic import() (T-037).
export function vocabIndexFor(targetLanguage: string): VocabIndexEntry[] {
  switch (targetLanguage) {
    case "zh":
      return ZH_VOCAB_INDEX;
    default:
      return [];
  }
}
