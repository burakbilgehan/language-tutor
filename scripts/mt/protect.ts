// T-064: bracket-notation / CJK protection for build-time MT.
//
// The LLM emits readings as bracket notation — furigana 漢字[かんじ] (ja) or
// pinyin 学习[xuéxí] (zh) — and the target-language sentence itself must never
// be touched by MT (only the surrounding native-language prose is what we're
// translating). Both are replaced with sentinel placeholders before the text
// goes to the MT engine, then restored verbatim afterward.
//
// This is deliberately a generic PROSE transform, not grammar-schema-specific,
// so kanji/vocab seeds (T-064 phase 2) can reuse it unchanged.

// Bracket notation: one or more non-space/non-bracket chars, immediately
// followed by [reading]. Matches 漢字[かんじ] and 学习[xuéxí] alike.
const BRACKET_RE = /[^\s[\]]+\[[^\]]+\]/g;

// Bare CJK/kana runs with no bracket reading (e.g. a lone は or a hanzi
// mentioned inline without furigana). Hiragana/katakana + CJK unified
// ideographs + CJK punctuation ranges.
const CJK_RE =
  /[぀-ヿ㐀-鿿豈-﫿　-〿]+/g;

// Sentinel token shape: letters only, NO DIGITS. Measured against the Argos
// engine (scripts/mt/setup-argos.sh): a digit-bearing token like
// "XPLACEHOLDERX13X" comes back mangled as "XPLACEHOLDERX13X13X" for roughly
// half of real topic intros — the tokenizer's number-handling occasionally
// echoes/duplicates numeric substrings across a word boundary. A base-26
// letter encoding (fixed 4-char body, `pfx`/`sfx` wrapper) round-tripped 0/14
// missing across every field of every sample tried, vs. ~1-3/14 for the
// digit form and total loss for a private-use-area single-char encoding
// (unknown-codepoint tokens get silently dropped, not preserved).
const PFX = "zzk";
const SFX = "zzk";
const ALPHABET = "abcdefghijklmnopqrstuvwxyz";
const CODE_LEN = 4; // 26^4 ≈ 457k slots — far beyond any single topic's field count

function encodeIndex(i: number): string {
  let s = "";
  let n = i;
  do {
    s = ALPHABET[n % 26] + s;
    n = Math.floor(n / 26);
  } while (n > 0);
  return s.padStart(CODE_LEN, "a");
}

function decodeIndex(code: string): number {
  let n = 0;
  for (const c of code) n = n * 26 + ALPHABET.indexOf(c);
  return n;
}

const PLACEHOLDER_RE = new RegExp(`${PFX}([a-z]{${CODE_LEN}})${SFX}`, "g");

export interface ProtectedText {
  protected: string;
  placeholders: string[];
}

/** Replace every bracket-notation run and bare CJK/kana run with a sentinel
 * placeholder. Order matters: bracket runs first (they contain CJK), so the
 * CJK pass never re-matches inside an already-protected bracket run. */
export function protectText(text: string): ProtectedText {
  const placeholders: string[] = [];
  const stash = (m: string) => {
    placeholders.push(m);
    return ` ${PFX}${encodeIndex(placeholders.length - 1)}${SFX} `;
  };
  const afterBrackets = text.replace(BRACKET_RE, stash);
  const afterCjk = afterBrackets.replace(CJK_RE, stash);
  return { protected: afterCjk, placeholders };
}

/** Restore placeholders after MT. Returns the count of placeholders that did
 * NOT come back (MT engines can drop or mangle sentinel tokens) — callers
 * MUST treat a non-zero count as a failed translation for that string, never
 * silently ship partially-restored text (a lost placeholder means the
 * target-language sentence or bracket reading is gone from the output). */
export function restoreText(
  translated: string,
  placeholders: string[]
): { restored: string; missing: number } {
  let seen = 0;
  const restored = translated.replace(PLACEHOLDER_RE, (_m, code) => {
    const idx = decodeIndex(code);
    if (idx >= 0 && idx < placeholders.length) seen++;
    return placeholders[idx] ?? "";
  });
  return { restored, missing: placeholders.length - seen };
}

/**
 * Every bracket-notation/bare-CJK run found in the ORIGINAL text must still
 * be present, verbatim, in the translated text. This is the invariant that
 * actually matters — checked directly against the real output rather than
 * inferred from whether a sentinel token round-tripped, so it works
 * regardless of whether the engine used placeholders at all (an LLM that
 * preserves 漢字[かんじ] because it was asked to, with no protection layer in
 * the way, passes this exactly like an NMT engine restoring a placeholder
 * does). Shared by the topic-content pipeline and the titles pass — any
 * output with a non-zero count must be rejected, never shipped.
 */
export function countUnpreservedRuns(original: string, translated: string): number {
  const runs = [
    ...(original.match(BRACKET_RE) ?? []),
    ...(original.match(CJK_RE) ?? []),
  ];
  return runs.filter((run) => !translated.includes(run)).length;
}
