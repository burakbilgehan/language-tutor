// T-100: single entry point for the /travel guide content.
import { GUIDES_A_JA } from "./guides-a-ja";
import { GUIDES_B_JA } from "./guides-b-ja";
import type { Guide } from "./types";

export { KANJI_GROUPS_JA } from "./kanji-ja";
export { PHRASEBOOK_JA } from "./phrasebook-ja";
export type * from "./types";

/** Trip order: arrive, move, sleep, eat, pay, talk, see, cope. */
const ORDER = [
  "arrival",
  "train",
  "taxi-bus",
  "stay",
  "restaurant",
  "konbini",
  "money",
  "numbers",
  "keigo",
  "sightseeing",
  "emergency",
];

const rank = (g: Guide) => {
  const i = ORDER.indexOf(g.key);
  return i === -1 ? ORDER.length : i;
};

export const GUIDES_JA: Guide[] = [...GUIDES_A_JA, ...GUIDES_B_JA].sort(
  (a, b) => rank(a) - rank(b)
);
