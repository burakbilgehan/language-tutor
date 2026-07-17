// Language-aware answer comparison dispatcher. jp.ts's answersMatch treats
// any CJK ideograph as Japanese (kana folding via wanakana), which is wrong
// for Chinese — route by the profile's target language instead.
import { answersMatch } from "./jp";
import { answersMatchZh } from "./zh";

export function answersMatchFor(
  targetLanguage: string,
  expected: string,
  given: string
): boolean {
  return targetLanguage === "zh"
    ? answersMatchZh(expected, given)
    : answersMatch(expected, given);
}
