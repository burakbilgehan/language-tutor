import { JA_GRAMMAR_INDEX, type GrammarIndexEntry } from "./ja";
import { NL_GRAMMAR_INDEX } from "./nl";
import { ZH_GRAMMAR_INDEX } from "./zh";

export type { GrammarIndexEntry };

export function grammarIndexFor(targetLanguage: string): GrammarIndexEntry[] {
  switch (targetLanguage) {
    case "ja":
      return JA_GRAMMAR_INDEX;
    case "zh":
      return ZH_GRAMMAR_INDEX;
    case "nl":
      return NL_GRAMMAR_INDEX;
    default:
      return [];
  }
}

// T-064: index titles are tr-only source data (title_tr on every entry
// above). For a non-tr native profile, showing the raw tr title in the
// sidebar/topic header is the single biggest piece of "this app is still in
// Turkish" even once the topic CONTENT is translated/LLM-generated — so
// titles get their own one-time translation pass (scripts/mt-grammar-titles.ts),
// committed as src/lib/grammar-index/titles.<target>.<native>.json (slug →
// title), loaded here as a plain bundled import (small: ~500 short strings,
// unlike the multi-MB grammar-seed content files which are fetched from
// public/ instead).
//
// This is deliberately NOT stamped source:"mt" / badged like topic content —
// the ticket's badge requirement is about topic CONTENT (tables/examples),
// which a user can regenerate with their own LLM. A title is one line of
// display text with no equivalent "regenerate" action, so there is nothing
// for a badge to gate; see the open question in the T-064 report.
// Statically imported (not a computed require/fetch) so bundlers — webpack/
// turbopack for the server build, AND the static/browser build, which has no
// runtime `require` at all — can resolve and code-split these at build time.
// That means the files MUST exist on disk even before a language pair's
// translation pass has run: scripts/mt-grammar-titles.ts's output starts as
// (and a slug it hasn't reached yet stays) an empty/partial object, never a
// missing file, so this import never breaks the build. An absent slug in the
// loaded map simply falls back to the tr title below.
import jaEn from "./titles.ja.en.json";
import zhEn from "./titles.zh.en.json";
import nlEn from "./titles.nl.en.json";

type Titles = Record<string, string>;

function titlesFor(targetLanguage: string, nativeLanguage: string): Titles | null {
  if (nativeLanguage !== "en") return null;
  switch (targetLanguage) {
    case "ja":
      return jaEn as Titles;
    case "zh":
      return zhEn as Titles;
    case "nl":
      return nlEn as Titles;
    default:
      return null;
  }
}

/**
 * Display title for one grammar topic in `nativeLanguage`. Falls back to the
 * tr title (`entry.title_tr` / the DB row's `titleTr`) when nativeLanguage is
 * tr, the language pair has no committed translation file, or the slug isn't
 * in it yet (a topic added to the index after the translation pass ran, or
 * not yet reached by an in-progress incremental run).
 */
export function titleFor(
  targetLanguage: string,
  slug: string,
  trTitle: string,
  nativeLanguage: string
): string {
  return titlesFor(targetLanguage, nativeLanguage)?.[slug] ?? trTitle;
}
