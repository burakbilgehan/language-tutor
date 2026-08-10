---
id: T-086
title: Fix 4 confirmed conjugation algorithm bugs (nl x3, ja x1)
status: todo
priority: p1
effort: S
confidence: high
depends: []
created: 2026-08-10
---
The T-023 audit (`tickets/T-023-audit-report.md`) confirmed, by actually
running `conjugateNl`/`conjugateJa`, four bugs in the static conjugation code.
These show wrong forms deterministically to every /conjugate visitor, so they
outrank all LLM-content work.

1. `nl.ts:293` area: weak participles double a final t/d: gepraatt, gewachtt,
   geantwoordd, geredd, gevoedd, verwachtt. Dutch spelling forbids doubled
   final consonants; correct: gepraat, gewacht, geantwoord, gered, gevoed,
   verwacht.
2. `nl.ts:344` area: present plural of separable verbs re-appends the prefix
   the infinitive already carries: "opbellen op", "opstaan op", "aankomen
   aan", example "Wij opbellen op samen." Correct: plain infinitive form
   (wij bellen op is the finite form; the table row must not duplicate the
   prefix).
3. `nl.ts:186` area: the open-syllable lengthening rule breaks -aan verbs and
   vowel-initial stems: gaan/staan/slaan give jij "gat"/"stat"/"slat", eten
   gives ik "et". Correct: gaat/staat/slaat, ik eet.
4. `ja.ts:351` area: the i-adjective stem rule treats every adjective ending
   in いい like 良い: かわいい conjugates to かわよくない/かわよかった.
   The よ irregularity belongs only to the いい/良い morpheme itself; かわいい
   must give かわいくない/かわいかった.

Acceptance: unit tests covering each listed wrong form (praten, wachten,
antwoorden, redden, voeden, verwachten, opbellen, opstaan, aankomen, gaan,
staan, slaan, eten, かわいい plus the still-correct 良い) pass; `npm test`
green; no behavior change outside the four rules.
