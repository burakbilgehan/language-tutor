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
 * Fold Turkish diacritics to ASCII so "hayir" matches "hayır", "asagi"
 * matches "aşağı" — the user shouldn't lose an answer to a missing dot.
 */
const TURKISH_FOLD: Record<string, string> = {
  ı: "i",
  ş: "s",
  ç: "c",
  ğ: "g",
  ö: "o",
  ü: "u",
  â: "a",
  î: "i",
  û: "u",
};

function foldTurkish(s: string): string {
  return s.replace(/[ışçğöüâîû]/g, (ch) => TURKISH_FOLD[ch] ?? ch);
}

/**
 * Answer equivalence check. Japanese-aware when either side contains
 * kana/kanji; otherwise normalized compare with Turkish diacritics folded
 * (Turkish, Dutch, ...).
 */
export function answersMatch(expected: string, given: string): boolean {
  if (basicNormalize(expected) === basicNormalize(given)) return true;
  if (hasJapanese(expected) || hasJapanese(given)) {
    return canonicalJa(expected) === canonicalJa(given);
  }
  const e = foldTurkish(basicNormalize(expected));
  const g = foldTurkish(basicNormalize(given));
  if (e === g) return true;
  // Whitespace-insensitive: "a i u e o" (normalized "a, i, u, e, o") = "aiueo".
  return e.replace(/\s+/g, "") === g.replace(/\s+/g, "");
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

/**
 * Split mixed text into CJK-script runs (kana/hanzi/CJK punctuation) and
 * everything else, so CJK typography (font stack, size bump) can be applied
 * to exactly the CJK glyphs — not to Turkish prose surrounding them.
 *
 * Script alone can't tell ja kanji from zh hanzi (kanji is a subset of
 * hanzi code points). Callers that know the profile's target language
 * should pass `knownLang` — it wins outright. Without it, kana presence is
 * the fallback signal: kana is ja-exclusive, so if the *whole* string has no
 * kana anywhere, an unbracketed run is treated as zh. That fallback still
 * mislabels an all-kanji ja run (rare — ja sentences are furigana-bracketed
 * by prompt design, and bracketed hanzi never reaches this path; it's
 * consumed by parseFurigana first) as zh when no caller-supplied lang is
 * available.
 */
export function splitCjkRuns(
  s: string,
  knownLang?: "ja" | "zh" | null
): { text: string; lang: "ja" | "zh" | null }[] {
  const hasKana = /[぀-ヿ]/.test(s);
  const fallback = knownLang ?? (hasKana ? "ja" : "zh");
  const runs: { text: string; lang: "ja" | "zh" | null }[] = [];
  const re = /[　-〿぀-ヿ一-鿿]+/g;
  let last = 0;
  for (const m of s.matchAll(re)) {
    if (m.index! > last)
      runs.push({ text: s.slice(last, m.index), lang: null });
    runs.push({ text: m[0], lang: fallback });
    last = m.index! + m[0].length;
  }
  if (last < s.length) runs.push({ text: s.slice(last), lang: null });
  return runs;
}

/** Strip furigana brackets: 漢字[かんじ] → 漢字 (for comparisons/tooltips). */
export function stripFurigana(text: string): string {
  return text.replace(FURIGANA_RE, "$1");
}
