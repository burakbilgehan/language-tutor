export type JaWordClass =
  | "godan"
  | "ichidan"
  | "suru"
  | "kuru"
  | "i-adjective"
  | "na-adjective";

export interface ConjInput {
  /** Dictionary form as the user typed it: 食べる, たべる, 勉強する, 高い. */
  surface: string;
  /** Hiragana reading; unnecessary when the surface is already all-kana. */
  reading?: string;
  wordClass: JaWordClass;
}

export interface ConjForm {
  id: string;
  labelTr: string;
  labelEn: string;
  /** Suffix hint shown next to the label: 〜ます, 〜させられる. */
  pattern: string;
  surface: string;
  /** Full-kana rendering; null when no reading is known for a kanji surface. */
  kana: string | null;
  romaji: string | null;
  /** Bracket notation for the Furigana component: 食[た]べます. */
  furigana: string;
  /**
   * Verb-agnostic example: ja has the conjugated word inlined (bracket
   * notation); tr/en translate the frame with 〜 standing for the word.
   */
  example: { ja: string; tr: string; en: string } | null;
}

export interface ConjGroup {
  id: string;
  labelTr: string;
  labelEn: string;
  forms: ConjForm[];
}

export type ConjResult =
  | { ok: true; groups: ConjGroup[]; notes: { tr: string; en: string }[] }
  | { ok: false; errorTr: string; errorEn: string };

export interface ConjPreset {
  surface: string;
  reading: string;
  wordClass: JaWordClass;
  /** Why this preset is in the list — shown as the chip's tooltip. */
  hintTr: string;
  hintEn: string;
}

/** Per-language seam, grammarIndexFor-style. */
export interface Conjugator {
  conjugate(input: ConjInput): ConjResult;
  guessClass(kanaOrSurface: string): JaWordClass | null;
  presets: ConjPreset[];
  wordClasses: { id: JaWordClass; labelTr: string; labelEn: string }[];
}
