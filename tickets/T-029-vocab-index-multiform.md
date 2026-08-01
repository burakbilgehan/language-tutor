---
id: T-029
title: Vocab index multi-form entries, 马 "surname Ma" / "horse" can't be found
status: done
priority: p2
effort: S
confidence: high
depends: []
created: 2026-07-22
---
Closed (2026-07-22, implemented in the backlog session). Rule applied:
primary form = among the non-proper-noun forms (pinyin not starting with a
capital letter), the one with the MOST glosses (so that for 骑 it picks qí,
not the single-gloss jì, i.e. "richest form" instead of "first form"); all
forms' glosses are union'd without loss (MAX_GLOSSES removed), classifiers
also union'd. Verified: 马 -> "mǎ | horse ... surname Ma" (surname is
searchable), 骑 -> qí, 地/得/还/行 list all reading meanings; searching
"horse" returns 马/马上/骑/乘/匹. 4991 entries, level distribution unchanged.
Rollout to existing profiles: ensureVocabSeeded's diff-sync already updates
the reading/meaningsEn/classifiers fields, no extra work needed.

Root cause (2026-07-22): `scripts/build-vocab-index.mjs` took "the FIRST form
that has a gloss" for multi-form entries. 马's first form is Mǎ (surname),
the second is mǎ (horse), so only "surname Ma" made it into the index.
Result: a nonsensical listing + an English search for "horse" can't find 马.
Not an LLM error, a distillation error.

Decision (Burak): merging should NOT be lossy (downsampling). Rule:
1. **Primary form** = the non-proper-noun form (glosses not in a proper-noun
   pattern; "surname X" / a single capitalized gloss, etc.). The displayed
   reading + first gloss come from it (mǎ, "horse").
2. **All forms' glosses are union'd**, the `en` list drops no meaning; the
   surname meaning stays in the list too, just not first. The `MAX_GLOSSES=4`
   cutoff works against this goal, remove it or apply it per form; keep the
   SKIP_GLOSS junk filter ("variant of" etc.).
3. Search already does `meaningsEn.some(includes)`, thanks to the union
   whichever meaning is searched, the word comes up ("horse" and "surname"
   both find 马).

Work: fix the script -> regenerate `src/lib/vocab-index/zh-data.json` with
`node scripts/build-vocab-index.mjs` -> commit. Verify the static half's
`ensureVocabSeeded` diff-sync carries the new glosses to existing profiles
(if not, add `en`/`reading` to the sync fields).

Verification: 马 shows "mǎ / horse" in the list; both "horse" and "surname"
searches return 马; parity harness ALL PASS; eyeball check a few other
multi-form entries (multi-reading ones like 地, 得, 还).
</content>
