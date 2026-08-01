---
id: T-033
title: Dictionary search, no ranking, "ma" spews irrelevant results
status: done
priority: p1
effort: S
confidence: high
depends: []
created: 2026-07-22
---
Symptom (Burak, live screenshot): typing "ma" in the dictionary returns
irrelevant results like 了/是/你/和/好/小/做; 马/妈/吗 aren't on top.

Cause: the `VocabSidebar` filter is plain substring:
`fold(reading).includes(q)` + `meaningsEn.some(m => fold(m).includes(q))`.
"ma" matches INSIDE glosses like "many", "small", "make", "marker",
"(coll.) what?". The T-029 union deliberately grew the gloss lists; the
search layer wasn't adjusted for that, so noise increased (the part of
T-029 left unfinished).

Fix: a scored ranking layer + threshold, this is a sorting problem, not
a filtering one:
1. Tiers (highest to lowest):
   a. CJK word match (if the query contains hanzi: exact > prefix >
      substring).
   b. Reading FULL syllable match, toneless fold ("ma" == mǎ/má/mā/ma).
   c. Reading prefix ("ma" -> mǎshàng; "mashang" -> 马上).
   d. Gloss word-boundary match (via \b; "horse" as a whole word).
   e. Gloss substring; only when the query is >=3 characters and the
      tiers above are empty; should never fire for short queries like "ma".
2. Within-tier ordering: level (HSK1 first) + position (frequency is
   already embedded in position).
3. Consistency with the cmd+K palette's reading-aware logic (T-016,
   `search-index.ts`); extract a shared helper if possible, no duplicated
   rules.
4. A separate small piece: 吗's primary form shows up as má "(coll.)
   what?"; the build script's tie-break falls back to dataset order on
   ties. The neutral-tone form (unmarked pinyin) should win for particles
   (吗->ma, 得->de etc.). Add a tie-break to `build-vocab-index.mjs` +
   re-export the index; review changed primary readings in the diff
   (behavior change).

Verification: "ma" -> 妈/马/吗 in the top three, 小/那/做/了 NOT in the
list; "horse" -> 马 on top; "mashang" -> 马上; pasting hanzi (马) exact match
on top; parity harness ALL PASS (if core is touched).
