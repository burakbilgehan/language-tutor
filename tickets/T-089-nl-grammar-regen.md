---
id: T-089
title: Regenerate all nl grammar topic content with sonnet
status: done
priority: p1
effort: M
confidence: medium
depends: []
created: 2026-08-10
---
nl grammar is the one surface T-023 judged beyond field-level repair: 72.5%
of sampled topics carry real errors, and whole topics have `reading` fields
filled with invented pseudo-phonetics ("zay sHaamen ziH voor hün Hedrah")
that `GrammarTopicView.tsx:190` renders to users. Confirmed criticals also
include false rules taught as correct ("Ze houden van zich.", the
elke/ieder/welk always-e rule, "De vrouw is lezend").

Change: regenerate the CONTENT of all 72 nl `grammar_topics` rows (both tr
and en payloads) in `data/app.db` with the content pipeline at
`LLM_MODEL_FAST=sonnet` (or the balanced tier), NOT haiku. The static index
(slugs, titles, levels, positions) stays untouched. nl examples must leave
the `reading` field null; there is no transcription convention for Dutch.

Scope guard: writes go ONLY to the local `data/app.db` snapshot. No seed
re-export, no deploy (that is T-092, owner-gated). Backups of the pre-regen
DB exist (2026-08-10, Desktop + Downloads).

Acceptance: all 72 topics status ready with regenerated content, zod-valid,
spot-check of 10 topics shows correct Dutch and no pseudo-phonetic readings;
`npm run llm:smoke` unaffected.

## Result

Regenerated all 72 nl `grammar_topics` rows, both tr and en payloads (144
generation units total), using `scripts/regen-content.ts nl-grammar`
against the real `getProvider()` content pipeline (local `claude` CLI, Max
subscription). Grammar generation uses `tier: "balanced"`, whose CLI
default already resolves to sonnet with no config file present; confirmed
empirically via `llm_calls`: every recorded call for this run shows
`model=sonnet tier=balanced purpose=grammar`, zero haiku.

Added an explicit `targetLanguage === "nl"` branch to
`src/lib/llm/prompts/grammar.ts` instructing the model to always leave
`examples[].reading` null and never invent pseudo-phonetic transcriptions
(the previous generic "Latin-alphabet, leave reading blank" instruction was
being ignored). The driver also deterministically nulls
`examples[].reading` on every nl payload as a belt-and-braces guarantee,
independent of whether the model follows the new instruction.

Execution went through three phases after an owner instruction mid-run
rescinded the original serial-only constraint and asked for a bounded
concurrent worker pool instead (with a further instruction to raise the
pool ceiling from 4-6 to 16-20 concurrent `claude` CLI calls): 42 units
serial (~78.6s/call), then the remainder at a concurrent pool (conc=4, then
conc=16 after the ceiling override), finishing at conc=16 with zero
transient rate-limit/quota errors throughout. One unit (`cleft-sentences`
tr) hit a 300s CLI timeout during the concurrent phase and was correctly
left unmarked by the driver's resume ledger; a small follow-up relaunch
(conc=4) picked it up and completed both its language halves cleanly. The
driver's work-unit design processes both language halves of one DB row
sequentially inside a single pool worker (never split across two workers)
specifically to avoid a read-then-await-then-merge-write lost-update race
that would otherwise silently drop one language's regenerated content when
concurrency is above 1 -- this was caught and fixed before any real
generation ran at the wrong shape.

Verification (all read-only checks, run after the last unit completed):
- Ledger: 144/144 keys present (`nl-grammar:<slug>:tr` and `:en` for all 72
  slugs).
- `scripts/regen-content.ts validate-nl`: `VALIDATE ok=144 fail=0` -- every
  payload parses against `GrammarTopicSchema` AND has `reading: null` on
  every example, no exceptions.
- `grammar_topics` row status: all 72 nl rows `ready`.
- `llm_calls` since run start: 142 rows, 100% `model=sonnet tier=balanced
  purpose=grammar` (a small under-count vs. 144 calls is expected --
  `recordCall` in `src/lib/llm/shared.ts` inserts fire-and-forget via a
  dynamic `import("@/db")`, so the very last call(s) before a clean process
  exit can race the insert; the DB content itself is confirmed correct by
  the ledger + validate-nl checks above regardless).
- `npm run llm:smoke`: ran both in `LLM_PROVIDER=fixture` mode (validates
  the curriculum fixture, OK) and for real against the live CLI (returned
  `model=haiku tier=fast`, i.e. unaffected by the driver's
  `LLM_MODEL_FAST=sonnet` env override, which was scoped to the driver's
  own process only).

Spot-check (10 topics: the 5 named in the audit + 5 random via seeded
sample):

- `reflexive-verbs`: no "Ze houden van zich." anywhere in the payload; the
  ungrammatical predicate is gone. Example: "Hij scheert zich niet elke
  dag." / "O her gün tıraş olmuyor."
- `participle-adjectives`: no "De vrouw is lezend" predicative-participle
  claim. Example: "Het slapende kind maakte geen enkel geluid." / "Uyuyan
  çocuk hiç ses çıkarmıyordu."
- `adjective-inflection`: the false "elke/ieder/welk always -e" rule is
  corrected. The regenerated table splits determiners correctly: `welk`
  stays under "Belirli (bepaald) -> +e" (het grote raam, dit grote raam...,
  welk grote raam) while `elk`/`ieder` are correctly listed under
  "Belirsiz (onbepaald) -> -e yok, yalın" alongside `een`/`geen`/`menig` --
  i.e. the three determiners are no longer lumped into one always-e rule.
- `nominalization`: clean. Example: "Zij houdt van het lezen van spannende
  boeken." / "O, heyecanlı kitaplar okumayı sever."
- `relative-clauses`: clean. Example: "De man die naast mij woont, is
  architect." / "Yanımda oturan adam mimardır."
- `diminutives`, `archaic-case-remnants`, `modal-verbs`,
  `inseparable-prefixes`, `impersonal-passive` (random sample, seed 42):
  all zod-valid, natural Dutch, zero non-null readings across all five.

All 6 confirmed-critical grammar-nl findings from the audit are inside this
ticket's 72-topic sweep and were spot-checked above (readings garbage on
nominalization/relative-clauses/reflexive-verbs; "De vrouw is lezend" on
participle-adjectives; "Ze houden van zich." on reflexive-verbs; the
elke/ieder/welk rule on adjective-inflection) -- all confirmed gone.
Explicitly out of this ticket's scope: the 3 nl.ts conjugation CODE bugs
(static `src/lib/conjugation/nl.ts`, not `grammar_topics` content; a
separate T-023 finding and outside this agent's scope fence). Content
homogeneity note: the 21 topics regenerated during the initial serial
phase and the 51 done during the concurrent phases all went through the
identical prompt/tier; the phase split is a scheduling detail with no
content-quality implication.
