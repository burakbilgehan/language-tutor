---
id: T-058
title: Catalog freshness mechanism - Worker verification keeping model ids current
status: done
priority: p3
effort: M
confidence: medium
depends: [T-057]
created: 2026-07-27
---
Burak decision (2026-07-27): the curated model catalog (T-057) is bound to go
stale; he wants "an internal mechanism/worker to keep it correct and up to
date."

## Design (proposal, settled during the implementation session)
- Worker endpoint `GET /api/llm-catalog`: serves the versioned catalog JSON
  (source: a single JSON in the worker repo, KV not required).
- Worker cron (weekly): verifies the catalog's ids against OpenRouter's
  `GET /models` (public, no key needed); for non-OpenRouter providers, checks
  the closest mappable slugs. On finding a dead/renamed id, it does NOT
  auto-change anything AND does NOT stay silent, it produces a report
  (simple: the cron result to KV, a `staleWarnings` field in the
  `/api/llm-catalog` response; Burak updates the JSON once he sees it).
  Curation stays human, the mechanism only watches.
- Client: the catalog embedded at build time is ALWAYS the fallback; at
  runtime, if a `/api/llm-catalog` fetch succeeds, it layers on top
  (same-origin okumo.dev; falls back silently if there's no route in server
  mode). User experience never depends on the fetch succeeding.

Fence: `worker/` + the loading layer of `src/lib/llm/catalog.ts`. Touches
T-061's wizard side; if they run in the same wave, verify the catalog.ts
overlap before starting.
