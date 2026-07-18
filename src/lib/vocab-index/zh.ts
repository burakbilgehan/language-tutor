// Deterministic HSK word index (HSK1 → HSK6), level-major, frequency-ordered
// within each level. zh-data.json is GENERATED — do not hand-edit; rebuild
// with `node scripts/build-vocab-index.mjs` (source:
// drkameleon/complete-hsk-vocabulary, MIT, glosses derived from CC-CEDICT).
// Data lives in JSON, not a TS literal, for the same tsc reason as ja-data.
//
// The unit is the WORD (词), not the character: Chinese pedagogy and HSK
// itself are word-list based (unlike JLPT kanji study). Pinyin, English
// glosses and classifiers (量词) are objective dictionary facts kept static;
// native-language explanations + examples are LLM-generated per word and
// cached in the vocab_entries table. Array order == display order
// (position = array index).
import data from "./zh-data.json";

export interface VocabIndexEntry {
  word: string;
  /** Traditional form, present only when it differs from `word`. */
  trad?: string;
  /** Pinyin with tone marks. */
  reading: string;
  /** English glosses (fallback shown until native-language content exists). */
  en: string[];
  level: "HSK1" | "HSK2" | "HSK3" | "HSK4" | "HSK5" | "HSK6";
  /** Measure words (量词), when the dataset provides them. */
  cls?: string[];
  /** CEDICT-style part-of-speech codes (n, v, adj, ...). */
  pos?: string[];
}

export const ZH_VOCAB_INDEX = data as VocabIndexEntry[];
