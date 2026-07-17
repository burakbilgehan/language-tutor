/**
 * Compact JMdict lookup (server-side).
 *
 * `data.json` is a filtered subset of JMdict (common entries only: news1,
 * ichi1, spec1/2, gai1, nf01–nf24), shaped as [word, reading, gloss] triples.
 *
 * Data source: JMdict, property of the Electronic Dictionary Research and
 * Development Group (EDRDG), used under the CC BY-SA 4.0 licence.
 * https://www.edrdg.org/edrdg/licence.html — attribution required.
 */

import rawData from "./data.json";

type Triple = [word: string, reading: string, gloss: string];

export interface JmdictEntry {
  reading: string;
  gloss: string;
}

let index: Map<string, JmdictEntry> | null = null;

function buildIndex(): Map<string, JmdictEntry> {
  const map = new Map<string, JmdictEntry>();
  for (const [word, reading, gloss] of rawData as Triple[]) {
    // First occurrence wins: JMdict lists more common entries earlier.
    if (!map.has(word)) {
      map.set(word, { reading, gloss });
    }
  }
  return map;
}

/** Exact-match lookup of a Japanese word (kanji or kana form). */
export function lookupWord(word: string): JmdictEntry | null {
  if (!index) index = buildIndex();
  return index.get(word) ?? null;
}
