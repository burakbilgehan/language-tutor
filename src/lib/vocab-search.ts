// Ranked search over the zh vocab dictionary sidebar (T-033). A plain
// substring filter let short queries like "ma" surface junk — "ma" is
// substring-inside "many"/"make"/"small" glosses, burying 马/妈/吗 under
// 了/是/你/和/好/小/做. This scores every entry through layered relevance
// tiers instead of a single includes() check; layer + position (already
// level-major, see listVocab) fully order the results.
//
// Shares its folds with the cmd+K palette (search-index.ts, T-016) but NOT
// its scorer — the palette allows reading-substring and gloss-prefix matches
// that this dictionary view must not: a "ma" query must never surface a
// "make"/"small" gloss hit, which the palette's token-prefix rule would.

import type { VocabEntrySummary } from "@/lib/client-api";
import { foldPinyin } from "@/lib/zh";
import { foldWord, tokenize, isCjkQuery, foldJaReading } from "@/lib/search-index";

// The vocab list is single-language, so the reading's own script disambiguates:
// kana → ja (romaji fold), otherwise pinyin. A romaji query folds identically
// under both, so cross-fold false negatives don't arise.
const hasKana = (s: string) => /[぀-ゟ゠-ヿ]/.test(s);
const foldReading = (reading: string, needle: string) =>
  hasKana(reading) ? foldJaReading(needle) : foldPinyin(needle);

// Lower is better; layers per the ticket, high to low relevance. Each layer
// owns a wide integer band so a within-layer subscore (added below for the
// gloss layer) can never let an entry cross into an adjacent layer: a gloss
// hit, however good, must always rank below every reading/CJK hit.
const CJK_EXACT = 0;
const CJK_PREFIX = 1;
const CJK_SUBSTRING = 2;
const READING_EXACT = 3;
const READING_PREFIX = 4;
const GLOSS_WORD = 5;
const GLOSS_SUBSTRING = 6;
// Sub-band width reserved inside the gloss-word layer for its quality subscore
// (see glossWordSubscore). Kept < 1 so GLOSS_WORD + subscore stays in [5, 6)
// and never reaches GLOSS_SUBSTRING (6). Ordering within a query is what
// matters, not the absolute value.
const GLOSS_SUB_MAX = 0.999;

/**
 * Quality of a gloss-word match, in [0, GLOSS_SUB_MAX) — lower is better, so it
 * adds onto GLOSS_WORD without leaving the layer. Ranks (best→worst):
 *   1. the whole gloss IS the query ("horse" === "horse") — the word's core
 *      meaning, not a token buried in a longer definition;
 *   2. earlier gloss position (gloss[0] beats gloss[3] — glosses are emitted
 *      most-common-first);
 *   3. shorter gloss (a query token in a 2-word gloss beats the same token in a
 *      12-word gloss).
 * This is what makes "horse" rank 馬 (gloss[0]="horse", exact) above 引出す /
 * 競馬 whose gloss lists merely contain a "horse" token somewhere deeper.
 * Returns Infinity when no gloss token-matches (caller treats as non-match).
 */
function glossWordSubscore(
  meaningsEn: string[],
  glossNeedle: string
): number {
  let best = Infinity;
  for (let i = 0; i < meaningsEn.length; i++) {
    const gloss = meaningsEn[i];
    const tokens = tokenize(gloss);
    if (!tokens.includes(glossNeedle)) continue;
    const exact = tokens.length === 1 && tokens[0] === glossNeedle ? 0 : 1;
    // Position: earlier is better, saturating so deep glosses don't overtake a
    // later tier. Length: normalized into a small residual tiebreak.
    const position = Math.min(i, 20) / 21; // [0, ~0.95)
    const length = Math.min(gloss.length, 100) / 100; // [0, 1)
    // exact dominates position dominates length; all inside [0, GLOSS_SUB_MAX).
    const sub = (exact * 0.6 + position * 0.3 + length * 0.09) * GLOSS_SUB_MAX;
    if (sub < best) best = sub;
  }
  return best;
}

/**
 * Score one entry against a query. Returns Infinity when nothing matches.
 * `allowGlossSubstring` implements the ticket's global gate: gloss substring
 * (layer e) only fires when the whole result set had no hits in the layers
 * above AND the query is long enough to be non-noisy (>=3 chars) — a "ma"
 * query must stay empty rather than fall back to substring, not just rank
 * substring hits last.
 */
function scoreVocabEntry(
  v: VocabEntrySummary,
  rawQuery: string,
  glossNeedle: string,
  cjkNeedle: string,
  allowGlossSubstring: boolean
): number {
  // a. Word (hanzi/kanji) match — only meaningful for a CJK query; a latin
  // query must never substring-match the word itself.
  if (cjkNeedle) {
    if (v.word === cjkNeedle) return CJK_EXACT;
    if (v.word.startsWith(cjkNeedle)) return CJK_PREFIX;
    if (v.word.includes(cjkNeedle)) return CJK_SUBSTRING;
  }

  // b/c. Reading — folded exact, then prefix. The fold matches the reading's
  // script (kana→romaji for ja, pinyin for zh). Exact single-syllable pinyin
  // matches ("ma" == mǎ inside "mǎ shàng") are handled by the caller via
  // readingHasExactSyllable.
  const readingNeedle = foldReading(v.reading, rawQuery);
  if (readingNeedle) {
    const reading = foldReading(v.reading, v.reading);
    if (reading === readingNeedle) return READING_EXACT;
    if (reading.startsWith(readingNeedle)) return READING_PREFIX;
  }

  // d. Gloss whole-word match ("horse" as a full token, never a substring
  // like "ma" inside "make"/"small"). Within this layer a quality subscore
  // (exact-gloss > earlier-position > shorter) breaks ties, so "horse" ranks
  // 馬 (gloss[0]="horse") above entries that merely mention "horse" deeper in
  // a long definition. The subscore stays inside [GLOSS_WORD, GLOSS_SUBSTRING).
  if (glossNeedle) {
    const sub = glossWordSubscore(v.meaningsEn, glossNeedle);
    if (sub !== Infinity) return GLOSS_WORD + sub;
  }

  // e. Gloss substring — last resort, gated by the caller.
  if (allowGlossSubstring && glossNeedle.length >= 3) {
    for (const gloss of v.meaningsEn) {
      if (foldWord(gloss).includes(glossNeedle)) return GLOSS_SUBSTRING;
    }
  }

  return Infinity;
}

/**
 * Also accept a per-syllable reading match: pinyin readings are stored
 * space-joined ("mǎ shàng"), so a query like "ma" should exact-match the
 * first syllable of "mashang" even though the folded whole-reading isn't
 * equal to "ma". Returns true if any individual syllable folds to the query.
 * (No-op for ja: kana readings aren't space-separated, so the whole-reading
 * exact/prefix check above already covers them.)
 */
function readingHasExactSyllable(reading: string, rawQuery: string): boolean {
  return reading
    .split(/\s+/)
    .some((syl) => foldReading(reading, syl) === foldReading(reading, rawQuery));
}

/**
 * Rank vocab entries against a query, per T-033's layered scheme:
 * hanzi match > reading exact syllable > reading prefix > gloss whole-word
 * > gloss substring (only for query length >=3 and only when nothing above
 * matched anywhere in the list). Within a layer, entries keep their incoming
 * order — `entries` is already level-major + frequency-ordered (position),
 * so a stable sort preserves that as the tiebreak for free.
 */
export function rankVocab(
  entries: VocabEntrySummary[],
  query: string
): VocabEntrySummary[] {
  const raw = query.trim();
  if (!raw) return [];

  const cjkNeedle = isCjkQuery(raw) ? raw : "";
  const glossNeedle = foldWord(raw).replace(/[^a-z0-9]/g, "");
  // Reading folding is per-entry (fold matches each reading's script), so the
  // raw query is threaded down and folded inside the scorer.
  const hasReadingNeedle = /[a-z0-9]/i.test(raw) || isCjkQuery(raw);

  // First pass without gloss substring, to test whether layers a-d found
  // anything anywhere in the list.
  let anyUpperHit = false;
  const scored: { v: VocabEntrySummary; score: number }[] = [];
  for (const v of entries) {
    let score = scoreVocabEntry(v, raw, glossNeedle, cjkNeedle, false);
    if (
      hasReadingNeedle &&
      score > READING_EXACT &&
      readingHasExactSyllable(v.reading, raw)
    ) {
      score = READING_EXACT;
    }
    if (score !== Infinity) anyUpperHit = true;
    scored.push({ v, score });
  }

  // Second pass: only if nothing matched above AND the query is long enough,
  // allow gloss substring (layer e).
  if (!anyUpperHit && glossNeedle.length >= 3) {
    for (const entry of scored) {
      entry.score = scoreVocabEntry(entry.v, raw, glossNeedle, cjkNeedle, true);
    }
  }

  return scored
    .filter((e) => e.score !== Infinity)
    .sort((a, b) => a.score - b.score) // stable: ties keep position order
    .map((e) => e.v);
}
