// Deterministic, reading-aware global search over the static indexes
// (kanji / vocab / grammar). No LLM, no DB, no network — works in static
// mode too. Powers the cmd+K command palette (T-016).
//
// The whole point is reading-aware matching: typing "hikari" must surface 光,
// "nihao" must surface 你好. Kanji↔reading and hanzi↔pinyin are many-to-many,
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
  /** Pre-folded haystack terms; a query matches if it's a substring of one. */
  terms: string[];
}

/** Fold a romaji/kana reading to bare lowercase latin (strips kun markers). */
function foldJaReading(s: string): string {
  return toRomajiReading(s.replace(/[.\-]/g, ""))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Fold arbitrary latin query text (used for gloss/title/slug matching). */
function foldLatin(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Build the folded search index for a language once (memoize at the call
 * site — it walks ~7500 entries and folds every reading through wanakana).
 */
export function buildSearchIndex(targetLanguage: string): Indexed[] {
  const out: Indexed[] = [];

  // --- kanji (ja) ---
  for (const k of kanjiIndexFor(targetLanguage)) {
    const readings = [...k.on, ...k.kun];
    out.push({
      result: {
        kind: "kanji",
        title: k.char,
        reading: k.kun.map((r) => r.replace(/[.\-]/g, "")).join("、"),
        subtitle: k.en.join(", "),
        level: k.level,
        href: `/stroke?char=${encodeURIComponent(k.char)}`,
      },
      terms: [
        k.char,
        ...readings.map(foldJaReading),
        ...k.en.map(foldLatin),
      ].filter(Boolean),
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
      terms: [
        v.word,
        v.trad ?? "",
        foldPinyin(v.reading),
        ...v.en.map(foldLatin),
      ].filter(Boolean),
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
      terms: [foldLatin(g.title_tr), foldLatin(g.slug)].filter(Boolean),
    });
  }

  return out;
}

/**
 * Match a query against a prebuilt index. Folds the query both as a CJK
 * reading (romaji/pinyin) and as bare latin, then substring-matches against
 * the pre-folded terms. Grammar/latin queries fall through the reading fold
 * harmlessly (idempotent on ascii). Caps results to keep the palette usable —
 * "shi" alone matches half the dictionary.
 */
export function searchIndex(
  index: Indexed[],
  query: string,
  targetLanguage: string,
  limit = 24,
): SearchResult[] {
  const raw = query.trim();
  if (!raw) return [];

  const reading =
    targetLanguage === "zh" ? foldPinyin(raw) : foldJaReading(raw);
  const latin = foldLatin(raw);
  const needles = [...new Set([reading, latin, raw])].filter(Boolean);

  const out: SearchResult[] = [];
  for (const item of index) {
    if (item.terms.some((t) => needles.some((n) => t.includes(n)))) {
      out.push(item.result);
      if (out.length >= limit) break;
    }
  }
  return out;
}
