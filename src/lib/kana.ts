// Static kana tables: the /kana cheatsheet and the stroke trainer's kana list
// both read from here. Hepburn romaji, hand-authored (fixed forever).

export interface KanaCell {
  hira: string;
  kata: string;
  romaji: string;
}

export interface KanaRow {
  /** Row label, e.g. "k" for か-row; "" for the vowel row. */
  label: string;
  /** Fixed-width cells; null = gap in the syllabary (yi, ye, wu…). */
  cells: (KanaCell | null)[];
}

const c = (hira: string, kata: string, romaji: string): KanaCell => ({
  hira,
  kata,
  romaji,
});

export const GOJUON_HEADERS = ["a", "i", "u", "e", "o"];

export const GOJUON: KanaRow[] = [
  { label: "", cells: [c("あ", "ア", "a"), c("い", "イ", "i"), c("う", "ウ", "u"), c("え", "エ", "e"), c("お", "オ", "o")] },
  { label: "k", cells: [c("か", "カ", "ka"), c("き", "キ", "ki"), c("く", "ク", "ku"), c("け", "ケ", "ke"), c("こ", "コ", "ko")] },
  { label: "s", cells: [c("さ", "サ", "sa"), c("し", "シ", "shi"), c("す", "ス", "su"), c("せ", "セ", "se"), c("そ", "ソ", "so")] },
  { label: "t", cells: [c("た", "タ", "ta"), c("ち", "チ", "chi"), c("つ", "ツ", "tsu"), c("て", "テ", "te"), c("と", "ト", "to")] },
  { label: "n", cells: [c("な", "ナ", "na"), c("に", "ニ", "ni"), c("ぬ", "ヌ", "nu"), c("ね", "ネ", "ne"), c("の", "ノ", "no")] },
  { label: "h", cells: [c("は", "ハ", "ha"), c("ひ", "ヒ", "hi"), c("ふ", "フ", "fu"), c("へ", "ヘ", "he"), c("ほ", "ホ", "ho")] },
  { label: "m", cells: [c("ま", "マ", "ma"), c("み", "ミ", "mi"), c("む", "ム", "mu"), c("め", "メ", "me"), c("も", "モ", "mo")] },
  { label: "y", cells: [c("や", "ヤ", "ya"), null, c("ゆ", "ユ", "yu"), null, c("よ", "ヨ", "yo")] },
  { label: "r", cells: [c("ら", "ラ", "ra"), c("り", "リ", "ri"), c("る", "ル", "ru"), c("れ", "レ", "re"), c("ろ", "ロ", "ro")] },
  { label: "w", cells: [c("わ", "ワ", "wa"), null, null, null, c("を", "ヲ", "wo")] },
  { label: "", cells: [c("ん", "ン", "n"), null, null, null, null] },
];

export const DAKUTEN: KanaRow[] = [
  { label: "g", cells: [c("が", "ガ", "ga"), c("ぎ", "ギ", "gi"), c("ぐ", "グ", "gu"), c("げ", "ゲ", "ge"), c("ご", "ゴ", "go")] },
  { label: "z", cells: [c("ざ", "ザ", "za"), c("じ", "ジ", "ji"), c("ず", "ズ", "zu"), c("ぜ", "ゼ", "ze"), c("ぞ", "ゾ", "zo")] },
  { label: "d", cells: [c("だ", "ダ", "da"), c("ぢ", "ヂ", "ji"), c("づ", "ヅ", "zu"), c("で", "デ", "de"), c("ど", "ド", "do")] },
  { label: "b", cells: [c("ば", "バ", "ba"), c("び", "ビ", "bi"), c("ぶ", "ブ", "bu"), c("べ", "ベ", "be"), c("ぼ", "ボ", "bo")] },
  { label: "p", cells: [c("ぱ", "パ", "pa"), c("ぴ", "ピ", "pi"), c("ぷ", "プ", "pu"), c("ぺ", "ペ", "pe"), c("ぽ", "ポ", "po")] },
];

export const YOON_HEADERS = ["ya", "yu", "yo"];

export const YOON: KanaRow[] = [
  { label: "k", cells: [c("きゃ", "キャ", "kya"), c("きゅ", "キュ", "kyu"), c("きょ", "キョ", "kyo")] },
  { label: "s", cells: [c("しゃ", "シャ", "sha"), c("しゅ", "シュ", "shu"), c("しょ", "ショ", "sho")] },
  { label: "t", cells: [c("ちゃ", "チャ", "cha"), c("ちゅ", "チュ", "chu"), c("ちょ", "チョ", "cho")] },
  { label: "n", cells: [c("にゃ", "ニャ", "nya"), c("にゅ", "ニュ", "nyu"), c("にょ", "ニョ", "nyo")] },
  { label: "h", cells: [c("ひゃ", "ヒャ", "hya"), c("ひゅ", "ヒュ", "hyu"), c("ひょ", "ヒョ", "hyo")] },
  { label: "m", cells: [c("みゃ", "ミャ", "mya"), c("みゅ", "ミュ", "myu"), c("みょ", "ミョ", "myo")] },
  { label: "r", cells: [c("りゃ", "リャ", "rya"), c("りゅ", "リュ", "ryu"), c("りょ", "リョ", "ryo")] },
  { label: "g", cells: [c("ぎゃ", "ギャ", "gya"), c("ぎゅ", "ギュ", "gyu"), c("ぎょ", "ギョ", "gyo")] },
  { label: "j", cells: [c("じゃ", "ジャ", "ja"), c("じゅ", "ジュ", "ju"), c("じょ", "ジョ", "jo")] },
  { label: "b", cells: [c("びゃ", "ビャ", "bya"), c("びゅ", "ビュ", "byu"), c("びょ", "ビョ", "byo")] },
  { label: "p", cells: [c("ぴゃ", "ピャ", "pya"), c("ぴゅ", "ピュ", "pyu"), c("ぴょ", "ピョ", "pyo")] },
];

/**
 * Single-character kana for the stroke trainer, in chart order (caller picks
 * the hira or kata glyph). Yōon are excluded — two-glyph combos whose
 * components are already here.
 */
export const STROKE_KANA: KanaCell[] = [...GOJUON, ...DAKUTEN]
  .flatMap((row) => row.cells)
  .filter((cell): cell is KanaCell => cell !== null);
