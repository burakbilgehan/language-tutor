---
id: T-023
title: Content quality audit for haiku generation (hallucination sweep)
status: todo
priority: p1
effort: S
confidence: high
depends: []
created: 2026-07-18
---
All cheatsheet content (kanji/grammar/vocab) is generated with haiku; there's
a suspicion of made-up words / wrong readings / nonsensical meanings. A
separate Opus session will pull 100 random ready examples from `data/app.db`
(roughly 60 kanji / 20 vocab / 20 grammar) and cross-check them against the
static reference columns (onyomi/kunyomi, pinyin, meanings_en); definite
errors get marked `status='error'` so `scripts/blast-generate.ts` regenerates
them on the next run. The full prompt was given in the backlog session
(2026-07-18); the gist is above, the bar for "definite error" is high,
anything uncertain is just listed as "suspicious," UPDATEs happen while the
blast is paused.

Decision contingent on the outcome (to be discussed in the backlog session):
if the error rate is high, either (a) regenerate the errors with
`LLM_MODEL_FAST=sonnet` instead of haiku for the blast run, (b) grow the
sample, (c) tighten the prompts.

Sequencing: run this AFTER blast's content runs finish (the sample would be
skewed on partial content); the `seed:grammar`/`seed:vocab` re-exports happen
once QA comes back clean, to avoid packaging broken content into the seed.

**Parked (2026-07-18)**: the kanji+grammar leg was run (report:
`docs/kanji-content-audit-2026-07-18.md`, 2 definite errors across 78 kanji,
both TR glosses; readings/grammar clean). Once vocab generation finishes,
rerun with the vocab sample ONLY; then the seed exports.

**Todo (2026-07-31, scope revised)**: content is complete (vocab 4991, kanji
2211, grammar 298/184/72), seeds exported and deployed. Burak's decisions
(2026-07-31): (1) the audit is **READ-ONLY**: no changes to the DB, seeds, or
code; NO `status='error'` marking, no automatic regeneration triggered.
(2) Scope isn't just kanji/vocab: all content surfaces for all languages
(including nl; grammar + conjugation pages too). (3) The only output is a
report file `tickets/T-023-audit-report.md`; errors get noted there, what to
do about them gets decided together afterward.

Session prompt (give to a new opus session):

> Multilingual content quality audit (T-023). **READ-ONLY**: no writes to the
> DB, seed files, or code; the only output is the report file
> `tickets/T-023-audit-report.md` (also don't touch INDEX). Source:
> `data/app.db`. LLM content columns are `{tr: payload}` language-keyed
> (`src/lib/llm/lang-content.ts`); schemas in `src/lib/llm/schemas.ts`.
>
> Sample (random, balanced across levels):
> - **zh vocab** (`vocab_entries`, ~4991 ready): 80 words. Cross-check
>   content.tr against the static references (`reading` tone-marked pinyin,
>   `meanings_en`, `classifiers`): meanings_tr semantic drift, does the
>   example sentence's bracket pinyin match + does the sentence contain the
>   word + is translation_tr correct, does the classifier note contradict the
>   column, are the character breakdown and collocations made up.
> - **ja kanji** (`kanji_entries`, ~2211 ready): 40 characters. Onyomi/
>   kunyomi accuracy, meaning glosses, readings of example words, furigana
>   brackets (`漢字[かんじ]`).
> - **grammar** (`grammar_topics`): ja 25 + zh 25 + **nl 15** topics.
>   Explanation accuracy, whether example sentences actually illustrate the
>   grammar point, translations, ja furigana / zh pinyin bracket correctness;
>   sentence grammaticality for nl examples.
> - **conjugation** (`src/lib/conjugation/{ja,zh,nl}.ts`, static code, not
>   LLM): verify the conjugated forms in the tables with your own linguistic
>   knowledge (ja masu/te/nai chains, nl separable verbs + sterke werkwoorden,
>   zh particle usage).
>
> Classification: **definite error** (wrong reading/pinyin, wrong meaning, an
> example that doesn't contain the word, wrong conjugated form) and
> **suspicious** (uncertain), as separate lists. Report format: sample size
> per surface, definite error rate, error table (record key `word`/`char`/
> `slug` + field + current value + correct value + brief rationale),
> suspicious items, summary conclusion. If the rate exceeds 5% on any surface,
> write a recommendation (regeneration model / grow the sample / tighten the
> prompts) but implement NONE of them, that decision is Burak's. Write the
> report, do NOT commit, end the turn.
</content>
