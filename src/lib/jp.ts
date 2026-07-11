// Japanese text helpers shared by server routes and client components.
import { toHiragana, toRomaji, isJapanese } from "wanakana";

/** Any kana or kanji in the string? */
export function hasJapanese(s: string): boolean {
  return /[぀-ヿ一-鿿々-〇]/.test(s);
}

const basicNormalize = (s: string) =>
  s
    .trim()
    .toLocaleLowerCase("tr")
    .replace(/[.,!?。、！？・「」()（）\s]+/g, " ")
    .trim();

/**
 * Canonical form for comparing Japanese answers. The user types romaji
 * ("konnichiwa"), the expected answer may be kana/kanji — convert both to
 * hiragana and fold particle spellings (は/wa, を/o, へ/e) so either
 * spelling matches.
 */
const VOWEL_KANA: Record<string, string> = {
  a: "あ",
  i: "い",
  u: "う",
  e: "え",
  o: "お",
};

/**
 * Fold long-vowel spellings so equivalent writings compare equal:
 * ー → previous vowel (こーひー → こおひい), おう → おお, えい → ええ.
 * Slightly over-accepting (おう vs おお is lexical), fine for a tutor.
 */
function foldLongVowels(s: string): string {
  let out = "";
  for (const ch of s) {
    const prev = out[out.length - 1];
    const prevVowel = prev ? toRomaji(prev).slice(-1) : "";
    if (ch === "ー" && prev) {
      out += VOWEL_KANA[prevVowel] ?? ch;
    } else if (ch === "う" && prevVowel === "o") {
      out += "お";
    } else if (ch === "い" && prevVowel === "e") {
      out += "え";
    } else {
      out += ch;
    }
  }
  return out;
}

function canonicalJa(s: string): string {
  return foldLongVowels(toHiragana(basicNormalize(s)))
    .replace(/\s+/g, "")
    .replace(/は/g, "わ")
    .replace(/を/g, "お")
    .replace(/へ/g, "え");
}

/**
 * Answer equivalence check. Japanese-aware when either side contains
 * kana/kanji; plain normalized compare otherwise (Turkish, Dutch, ...).
 */
export function answersMatch(expected: string, given: string): boolean {
  if (basicNormalize(expected) === basicNormalize(given)) return true;
  if (hasJapanese(expected) || hasJapanese(given)) {
    return canonicalJa(expected) === canonicalJa(given);
  }
  return false;
}

/** Romaji rendering for the selection tooltip. Kanji passes through as-is. */
export function toRomajiReading(s: string): string {
  return toRomaji(s);
}

export { isJapanese };

/**
 * Furigana bracket notation: 漢字[かんじ] segments. LLM prompts emit this;
 * the Furigana component renders it as <ruby>.
 */
export interface FuriganaSegment {
  text: string;
  reading?: string;
}

const FURIGANA_RE = /([一-鿿々-〇]+)\[([^\]]+)\]/g;

export function parseFurigana(text: string): FuriganaSegment[] {
  const segments: FuriganaSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(FURIGANA_RE)) {
    if (m.index! > last) segments.push({ text: text.slice(last, m.index) });
    segments.push({ text: m[1], reading: m[2] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
}

/** Strip furigana brackets: 漢字[かんじ] → 漢字 (for comparisons/tooltips). */
export function stripFurigana(text: string): string {
  return text.replace(FURIGANA_RE, "$1");
}
