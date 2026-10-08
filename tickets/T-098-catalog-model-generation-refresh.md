---
id: T-098
title: Model catalog pins stale Claude versions on the API-key and OpenRouter doors
status: todo
priority: p2
effort: S
confidence: medium
depends: []
created: 2026-10-08
---
Owner (2026-10-08): the quality profile (Eko/Denge/En iyi) should name a
model family, not a version.

Current state (`src/lib/llm/catalog.ts`):

- `cli` and `bridge` doors: already family-level. They pass the bare
  aliases `haiku`/`sonnet`/`opus` to the claude CLI `--model`, which
  resolves to the current model of that family. Labels read
  "Claude Sonnet (CLI alias)"; fine, no version shown.
- `anthropic` (API key) door: pinned to `claude-haiku-4-5-20251001`,
  `claude-sonnet-5`, `claude-opus-5`. Stale: the current generation is
  `claude-haiku-5-5`, `claude-sonnet-5-5`, `claude-opus-5-5` (Opus 5.5 is
  also cheaper, $4/$20 vs $5/$25). The registry comment "Haiku 5 yok" is
  outdated.
- `openrouter` door: same pins under `anthropic/*` slugs.
- The T-058 Worker overlay only patches label/price on ids that already
  exist, so it cannot surface a newer generation; the catalog-check cron
  only flags dead ids.

To do:

1. Verify whether the Anthropic Messages API and OpenRouter offer a
   family-level alias that tracks the newest model (check the Models API /
   OpenRouter `/v1/models`). If yes, use it and label by family. If no,
   bump the pins to the current generation and make labels family-first
   (e.g. "Claude Sonnet", version as secondary text).
2. Mirror the change in `worker/src/catalog-data.ts` (T-058 copy).
3. Consider extending the catalog-check cron to warn when a newer
   generation of a pinned family exists, not only when an id dies.
