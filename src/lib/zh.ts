// Mandarin text helpers shared by server routes and client components.
// Mirrors the role of jp.ts for Japanese: the learner types pinyin (often
// without tone marks), expected answers may carry tone marks, tone digits,
// or hanzi.

/** Any hanzi in the string? */
export function hasHanzi(s: string): boolean {
  return /[一-鿿]/.test(s);
}

const basicNormalize = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[.,!?。，、！？·「」()（）'’\s]+/g, " ")
    .trim();

/**
 * Canonical form for comparing pinyin answers: strip tone diacritics
 * (nǐ → ni), drop tone digits after a syllable (ni3 → ni), fold ü/v
 * (IME convention: "nv" = "nü"), and remove spacing/punctuation so
 * "Nǐ hǎo!" == "ni hao" == "ni3hao3" == "nihao".
 */
export function foldPinyin(s: string): string {
  return basicNormalize(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/([a-z])[1-5](?![0-9])/g, "$1")
    .replace(/v/g, "u")
    .replace(/ü/g, "u")
    .replace(/\s+/g, "");
}

/**
 * Answer equivalence for Chinese profiles. Hanzi compare exactly (after
 * normalization); latin sides compare tone-insensitively as pinyin. A
 * hanzi-vs-pinyin pair never matches deterministically — that falls through
 * to LLM grading (answers are prompted to include toneless pinyin in
 * accept_also precisely so this stays rare).
 */
export function answersMatchZh(expected: string, given: string): boolean {
  if (basicNormalize(expected) === basicNormalize(given)) return true;
  if (hasHanzi(expected) || hasHanzi(given)) {
    return (
      basicNormalize(expected).replace(/\s+/g, "") ===
      basicNormalize(given).replace(/\s+/g, "")
    );
  }
  return foldPinyin(expected) === foldPinyin(given);
}
