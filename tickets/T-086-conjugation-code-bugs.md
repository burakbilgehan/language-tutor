---
id: T-086
title: Fix 4 confirmed conjugation algorithm bugs (nl x3, ja x1)
status: done
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

## Result

Done 2026-08-10. All four fixed at the rule, not at the symptom; `npm test`
250 pass / 0 fail. Reverting only the two source files fails exactly 4 tests,
one per bug, so the new tests genuinely pin the behavior.

1. **Weak participle doubling.** `part` reused the past-tense body `stem + d`,
   but the past keeps the doubled consonant because a vowel follows it
   (praatte, voedde) while the participle is word-final, where Dutch never
   writes a doubled consonant. New `nlParticipleBody` absorbs the suffix when
   the stem already ends in it; the past path is untouched. Fixes more than
   the six listed verbs (gezet, gehaat, gekost, geland, gebrand): same rule.
2. **Separable present plural.** The row passed `show(inf)` while `inf` still
   carries the prefix, so `show` appended it a second time. Now `show(base)`,
   which yields the split main-clause form (wij bellen op). `base === inf`
   for every non-separable verb, so those rows are byte-identical.
3. **Open-syllable lengthening.** Two independent defects. `eten -> et`:
   the guard `!VOWELS.includes(m[1].slice(-1))` was false for a vowel-initial
   stem because `"aeiou".includes("")` is true in JS, so lengthening was
   skipped; the empty prefix now counts as "no preceding vowel" (eet).
   `gaan -> jij gat`: the stem "ga" is correct, but appending -t closes the
   syllable and the long vowel must then be written double; the new
   `nlAddPresentT` doubles a final single a/e/o/u (gaat, staat, slaat) while
   leaving digraph stems (doet, ziet) and short stems (werkt, zit) alone.
4. **い-adjective よ stem.** The rule fired on the `いい` suffix alone. It
   belongs to the いい morpheme, which かっこいい/気持ちいい do contain but
   かわいい/可愛い (single morphemes) do not; a suffix test cannot separate
   them, so `usesYoStem` adds an exception set and is applied at all three
   sites (`iStem`, the `そう` builder, the note guard). いい, 良い and
   かっこいい are unchanged.

Out of scope, found while verifying, worth a follow-up ticket:

- `よい/良い` gives `よそう/良そう` instead of `よさそう/良さそう`; the `そう`
  irregularity gate only tests the `いい` spelling, not the よい one.
- `openen -> opeende/geopeend` and `opperen -> oppeerde/geoppeerd`: the
  lengthening rule wrongly lengthens schwa syllables. `opperen` is pinned by
  an existing false-positive-guard test, so changing it is a deliberate
  decision, not a drive-by fix.
