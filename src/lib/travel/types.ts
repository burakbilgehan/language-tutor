// T-100: content model for the /travel guide (kanji, guides, phrasebook).
// All data is authored and static (no LLM at runtime); it ships inside the
// precached app shell, so the whole guide works offline.
//
// Conventions for every Japanese string (`jp`, `word`, table cells):
// - Bracket furigana, the app-wide notation rendered by <Furigana>:
//   漢字[かんじ], one bracket per kanji run: 乗[の]り換[か]え.
// - Romaji is always given explicitly next to it (never derived).
// - `L` = both languages; tr is canonical, en mirrors it.

export type L = { tr: string; en: string };

export interface Phrase {
  jp: string;
  romaji: string;
  meaning: L;
  note?: L;
  /** Something you will HEAR (staff speech) rather than say. */
  hear?: boolean;
  /** Optional reply or variant shown under the phrase. */
  reply?: { jp: string; romaji: string; meaning: L };
}

export interface PhraseSection {
  key: string;
  icon: string;
  title: L;
  intro?: L;
  phrases: Phrase[];
}

/** Visual sign mockup, drawn in real-world sign colours (SignMockView);
 * the renderer also picks colour from the text (非常口/避難 green, 注意/危険
 * yellow caution, 女湯 red curtain). */
export type SignStyle =
  | "station" // station name board: kana above, kanji, romaji below
  | "exit" // yellow station exit (green when 非常口)
  | "info" // charcoal directional sign (green when 避難)
  | "warning" // red prohibition; yellow caution for 注意/危険
  | "shop" // shop plaque (営業中, 準備中)
  | "noren" // curtain-style restaurant / onsen entrance
  | "ticket"; // ticket / receipt / machine button

export interface SignMock {
  style: SignStyle;
  /** Main text exactly as printed on the sign (plain kanji/kana, no brackets). */
  jp: string;
  /** Secondary line as printed (romaji/English), optional. */
  sub?: string;
  /** Arrow for exit/info signs. */
  arrow?: "left" | "right" | "up" | "down";
  meaning: L;
}

export interface KanjiCompound {
  /** Plain word as printed on signs, e.g. 出口. */
  word: string;
  /** Kana reading of the whole word, e.g. でぐち. */
  reading: string;
  romaji: string;
  meaning: L;
}

export interface SignKanji {
  /** Single kanji. Readings are looked up from kanji-index at render time. */
  kanji: string;
  meaning: L;
  /** Where you will see it on the trip. */
  whereSeen: L;
  compounds: KanjiCompound[];
}

export interface KanjiGroup {
  key: string;
  icon: string;
  title: L;
  intro: L;
  kanji: SignKanji[];
  /** Sign mockups showing this group's kanji in context. */
  signs: SignMock[];
}

export interface DialogueLine {
  who: "staff" | "you";
  jp: string;
  romaji: string;
  meaning: L;
}

export type GuideBlock =
  /** Markdown prose; Japanese inside uses bracket furigana. */
  | { type: "text"; body: L }
  | { type: "heading"; text: L }
  | {
      type: "steps";
      title?: L;
      steps: { title: L; body: L; jp?: string; romaji?: string }[];
    }
  | { type: "dialogue"; title?: L; lines: DialogueLine[] }
  | { type: "phrases"; title?: L; items: Phrase[] }
  /** Cells: Japanese cells use bracket furigana; translated cells use L. */
  | { type: "table"; title: L; columns: L[]; rows: (string | L)[][] }
  | { type: "tip"; body: L }
  | { type: "signs"; title?: L; items: SignMock[] };

export interface Guide {
  key: string;
  icon: string;
  title: L;
  summary: L;
  blocks: GuideBlock[];
}
