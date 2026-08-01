---
id: T-074
title: Stamp the job id onto every bridge log line (running/done/cancelled)
status: todo
priority: p3
effort: XS
confidence: high
depends: []
created: 2026-08-01
---

## Problem

T-072 added the job identity only to the "request" log line. The `running`
(heartbeat), `done`, `cancelled`, `orphaned-finished`, `delivered-from-cache` lines are only labeled; when two jobs for the same lesson are running/queued at the same time, the logs can't be told apart ("how am I supposed to tell which job is which," 2026-08-01).

## Work

`scripts/llm-bridge.mjs`: append the job id (or, if none exists, a short local per-request counter) to ALL log lines as `id=xxxxxxxx`. The heartbeat closure and settle-time logs already have access to the job record; the change is straightforward. After the change, the `public` copy gets updated on deploy (the `out/` copy happens automatically in build-static).
