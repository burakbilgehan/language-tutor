---
id: T-089
title: Regenerate all nl grammar topic content with sonnet
status: todo
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
