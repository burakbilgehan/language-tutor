---
id: T-021
title: Conjugation cheatsheet, zh weak, nl empty; bring up to ja level
status: done
priority: p2
effort: M
confidence: medium
depends: []
created: 2026-07-18
---
The ja conjugation page was well received (reference quality). The zh side is
weak (`ZhAspectView.tsx` 96 lines, limited to aspect particles), nl is close
to empty (`NlConjugatorView.tsx` exists but doesn't feel like content). Data
files: `src/lib/conjugation/{ja,zh,nl}.ts` + `ja-charts.ts`.

Scope:
- **zh**: no verb conjugation, but there's an equivalent of ja's "chart"
  pattern: the aspect/particle system (了/过/着/在/正在), directional
  complements, resultative complements, 把/被 structures, question/negation
  patterns (不/没), auxiliaries (会/能/可以/要/想). Each with an example
  table, deterministic static data in the ja-charts format.
- **nl**: an actual conjugating language, present/past (zwak/sterk/onregelmatig),
  perfectum (hebben/zijn choice), separable verbs (touches T-006, that
  ticket's weak-verb list could feed from here), modal verbs, imperatief.
  Extend the existing engine in `nl.ts` + chart view. Content should be
  **static code** like ja (no LLM, deterministic), same philosophy as the
  grammar cheatsheet.

`conjugation-nl.test.ts` exists, new verb classes go in via added tests.
The `ja-charts.ts` format should be read first and copied exactly.

No dependency; touches the same files as T-006 (nl weak separable verbs),
handling them in the same session avoids conflicts.

## Status (2026-07-18)
Since the ticket was opened, commit f587ab9 ("Bigger zh/nl cheatsheets,
browser TTS, verified nl strong table") already covered this scope: on the zh
side, `ZH_ASPECT_GROUPS` has 6 groups (aspect/negation/future-modal/
time-frames/structures/questions, ~40 lines), on the nl side both the
`conjugateNl` engine (zwak/sterk/onregelmatig, perfectum, separable) and
`NL_PATTERN_GROUPS` (connector/infinitive/er/word-order, 4 groups). Both are
rendered in the views with a generic map (ZhAspectView, NlConjugatorView),
static data, no LLM. The ticket text no longer matched the repo; no
additional work was needed. T-006 (same session) remained a separate real bug
and was also resolved.
</content>
