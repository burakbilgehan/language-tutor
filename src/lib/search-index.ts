// Deterministic, reading-aware global search over the static indexes
// (kanji / vocab / grammar). No LLM, no DB, no network — works in static
// mode too. Powers the cmd+K command palette (T-016).
//
// The whole point is reading-aware matching: typing "hikari" must surface 光,
// "pengyou" must surface 朋友. Kanji↔reading and hanzi↔pinyin are many-to-many,
// so results are always a list, tagged by kind.

import { toRomajiReading } from "@/lib/jp";
import { foldPinyin } from "@/lib/zh";
import { kanjiIndexFor } from "@/lib/kanji-index";
import { vocabIndexFor } from "@/lib/vocab-index";
import { grammarIndexFor } from "@/lib/grammar-index";

export type SearchKind = "kanji" | "vocab" | "grammar";

export interface SearchResult {
  kind: SearchKind;
  /** Primary glyph/word/slug shown large. */
  title: string;
  /** Reading line (romaji/kana for ja, pinyin for zh); empty for grammar. */
  reading: string;
  /** Short meaning/title line. */
  subtitle: string;
  level: string;
  /** In-app destination for next/link navigation. */
  href: string;
}

interface Indexed {
  result: SearchResult;
  /** Folded readings (romaji/pinyin). Matched exact > prefix > substring. */
  readings: string[];
  /** Folded word tokens from glosses/titles. Matched exact > prefix only —
   *  never substring across a concatenated blob, which is what made "ma"
   *  match "(used to forM Attribute…)". */
  tokens: string[];
}

/** Fold a romaji/kana reading to bare lowercase latin (strips kun markers). */
function foldJaReading(s: string): string {
  return toRomajiReading(s.replace(/[.\-]/g, ""))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Diacritic-insensitive latin fold (Turkish çğışöü, Dutch é…): çekim→cekim. */
export function foldWord(s: string): string {
  return s
    .toLowerCase()
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** Split gloss/title text into folded word tokens. */
export function tokenize(s: string): string[] {
  return foldWord(s)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);
}

/** Any hanzi/kana in the string — used to gate CJK-exact/prefix layers. */
export function isCjkQuery(s: string): boolean {
  return /[぀-ゟ゠-ヿ一-鿿]/.test(s);
}

/**
 * Build the folded search index for a language once (memoize at the call
 * site — it walks ~7500 entries and folds every reading through wanakana).
 * Entries keep source order, which is level-major in all three indexes —
 * used as the relevance tiebreak (easier levels first).
 */
export function buildSearchIndex(targetLanguage: string): Indexed[] {
  const out: Indexed[] = [];

  // --- kanji (ja) ---
  for (const k of kanjiIndexFor(targetLanguage)) {
    out.push({
      result: {
        kind: "kanji",
        title: k.char,
        reading: k.kun.map((r) => r.replace(/[.\-]/g, "")).join("、"),
        subtitle: k.en.join(", "),
        level: k.level,
        href: `/stroke?char=${encodeURIComponent(k.char)}`,
      },
      readings: [...k.on, ...k.kun].map(foldJaReading).filter(Boolean),
      tokens: k.en.flatMap(tokenize),
    });
  }

  // --- vocab (zh) ---
  for (const v of vocabIndexFor(targetLanguage)) {
    out.push({
      result: {
        kind: "vocab",
        title: v.word,
        reading: v.reading,
        subtitle: v.en.join(", "),
        level: v.level,
        href: `/vocab?word=${encodeURIComponent(v.word)}`,
      },
      readings: [foldPinyin(v.reading)].filter(Boolean),
      tokens: v.en.flatMap(tokenize),
    });
  }

  // --- grammar (ja/zh/nl) ---
  for (const g of grammarIndexFor(targetLanguage)) {
    out.push({
      result: {
        kind: "grammar",
        title: g.title_tr,
        reading: "",
        subtitle: g.category,
        level: g.level,
        href: `/grammar?topic=${encodeURIComponent(g.slug)}`,
      },
      readings: [],
      tokens: [...tokenize(g.title_tr), ...tokenize(g.slug)],
    });
  }

  return out;
}

// Relevance scores, lower is better. Exact reading ("ma" → 吗 má) beats
// reading prefix ("ma" → 买 mǎi) beats gloss-word prefix ("ma" → "many")
// beats reading substring ("kari" → hikari).
const EXACT = 0;
const READING_PREFIX = 1;
const TOKEN_MATCH = 2;
const READING_SUB = 3;

function scoreEntry(
  item: Indexed,
  readingNeedle: string,
  tokenNeedle: string,
  cjkQuery: string,
): number {
  // Typing the glyph/word itself (的, 光, or a CJK fragment of it). Guarded
  // to CJK queries — a latin query must not substring-match titles ("yama"
  // is literally inside "alıkoyamamak").
  if (cjkQuery) {
    if (item.result.title === cjkQuery) return EXACT;
    if (item.result.title.includes(cjkQuery)) return READING_PREFIX;
  }

  let best = Infinity;
  if (readingNeedle) {
    for (const r of item.readings) {
      if (r === readingNeedle) return EXACT;
      if (r.startsWith(readingNeedle)) best = Math.min(best, READING_PREFIX);
      else if (r.includes(readingNeedle)) best = Math.min(best, READING_SUB);
    }
  }
  if (best > TOKEN_MATCH && tokenNeedle) {
    for (const t of item.tokens) {
      if (t === tokenNeedle || t.startsWith(tokenNeedle)) {
        best = Math.min(best, TOKEN_MATCH);
        break;
      }
    }
  }
  return best;
}

/**
 * Match a query against a prebuilt index, ranked by relevance: exact folded
 * reading, then reading prefix, then gloss/title word prefix, then reading
 * substring. Ties keep index order (level-major → easier levels first).
 * Capped — "shi" alone still matches a lot of the dictionary.
 */
export function searchIndex(
  index: Indexed[],
  query: string,
  targetLanguage: string,
  limit = 24,
): SearchResult[] {
  const raw = query.trim();
  if (!raw) return [];

  const readingNeedle =
    targetLanguage === "zh" ? foldPinyin(raw) : foldJaReading(raw);
  const tokenNeedle = foldWord(raw).replace(/[^a-z0-9]/g, "");
  const cjkQuery = isCjkQuery(raw) ? raw : "";

  const scored: { score: number; i: number }[] = [];
  for (let i = 0; i < index.length; i++) {
    const score = scoreEntry(index[i], readingNeedle, tokenNeedle, cjkQuery);
    if (score !== Infinity) scored.push({ score, i });
  }
  scored.sort((a, b) => a.score - b.score || a.i - b.i);
  return scored.slice(0, limit).map((s) => index[s.i].result);
}
