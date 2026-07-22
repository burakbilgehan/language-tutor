// Deterministic JLPT word index (N5 → N1), level-major. ja-data.json is
// GENERATED — do not hand-edit; rebuild with
// `node scripts/build-ja-vocab-index.mjs <jlpt_vocab.json> <jmdict-eng.json>`.
//
// Sources (attribution required, see the attribution page):
//   - JLPT levels: Jonathan Waller's tanos.co.uk lists (CC BY), via the
//     Bluskyo/JLPT_Vocabulary machine-readable conversion.
//   - Readings + English glosses: JMdict / EDRDG (CC BY-SA 4.0), via
//     scriptin/jmdict-simplified.
//
// Same shape as zh-data.json: word / reading (kana) / en[] (lossless gloss
// union) / level. `reading` is kana; the LLM-generated half (native-language
// meanings + furigana-bracketed examples) is cached in vocab_entries.
// Japanese has no measure-word (量词) field — that column stays null for ja.
import data from "./ja-data.json";
import type { VocabIndexEntry } from "./zh";

export const JA_VOCAB_INDEX = data as VocabIndexEntry[];
