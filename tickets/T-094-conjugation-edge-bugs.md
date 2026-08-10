---
id: T-094
title: Conjugation edge bugs found while fixing T-086 (ja sou-form, nl schwa)
status: todo
priority: p3
effort: S
confidence: high
depends: []
created: 2026-08-10
---
Two real bugs found and deliberately left out of T-086 (outside its four
rules; both recorded in that ticket's Result section):

1. `よい/良い` gives `よそう/良そう` instead of `よさそう/良さそう`: the そう
   irregularity gate in `src/lib/conjugation/ja.ts` only tests the いい
   spelling, not the よい one.
2. `openen -> opeende/geopeend`, `opperen -> oppeerde/geoppeerd`: the nl
   open-syllable lengthening rule wrongly lengthens schwa syllables. The
   `opperen` behavior is pinned by an existing test explicitly named as a
   false-positive guard, so changing it is a deliberate decision, not a
   drive-by fix; the fix needs a schwa-syllable heuristic (unstressed -e-
   before -ren/-len/-nen endings) rather than a blanket rule change.

Acceptance: both forms correct, existing conjugation tests still pass, the
false-positive-guard test updated with an explanatory note.
