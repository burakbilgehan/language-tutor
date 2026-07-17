// Deterministic JLPT kanji index (N5 → N1), level-major, frequency-ordered
// within each level. ja-data.json is GENERATED — do not hand-edit (source:
// davidluzgouveia/kanji-data ⊂ KANJIDIC2, filtered to chars with stroke data
// in @k1low/hanzi-writer-data-jp). Data lives in JSON, not a TS literal:
// a 2211-element literal array blows up tsc's union inference (TS2590).
//
// Readings (on/kun) and English glosses are objective dictionary facts kept
// static so the LLM never has to (mis)produce them; Turkish meanings +
// examples are LLM-generated per kanji and cached in the kanji_entries table.
// Array order == display order (position = array index).
import data from "./ja-data.json";

export interface KanjiIndexEntry {
  char: string;
  level: "N5" | "N4" | "N3" | "N2" | "N1";
  /** Onyomi readings (katakana per KANJIDIC, kept as-is). */
  on: string[];
  /** Kunyomi readings; "." separates okurigana, "-" marks affix position. */
  kun: string[];
  /** English glosses (fallback shown until Turkish content is generated). */
  en: string[];
}

export const JA_KANJI_INDEX = data as KanjiIndexEntry[];
