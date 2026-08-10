---
id: T-069
title: Kill the server/static duality: converge to static (local-first) as the single runtime
status: done
priority: p1
effort: XL
confidence: medium
depends: []
created: 2026-07-31
---

## Problem

Burak (2026-07-31): "I'm done with the server vs static split. You can't keep fighting this much discrepancy. At some point this duality has to go."

Concrete example: open-time lesson prefetch was added to server mode in early 2026 and never ported to the static seam; since production is static, the fix-less behavior was live in production (the root cause of T-068). This class of bug is structural: business logic is shared in `src/core/*`, but orchestration (jobs, prefetch, auto-extend, the requireLlm/503 paths) is written twice (`lib/jobs.ts` + routes vs. `client-api.ts`'s static branches + in-flight maps).

## Decision framework

Direction of convergence: static/local-first - production is already static (okumo.dev), and server mode's remaining functions are all replaceable. In the end, `npm run dev` runs the static bundle; dev and production share a code path for the first time, and the "fixed on server, forgotten on static" bug class becomes impossible.

## Prerequisites (each mergeable on its own)

1. **Fixture dev loop in static mode**: give the browser provider a fixture mode (serving `src/lib/llm/fixtures/` canned JSON from the browser). Replaces the token-free dev loop.
2. **Max CLI access**: already solved - `npm run llm:bridge` + the "Local bridge" preset. Only Burak's daily flow needs to move to the bridge and get verified.
3. **Seed export scripts** (`seed:grammar/kanji/vocab`): must be able to take an exported .db snapshot as the source instead of `data/app.db` (the format is already the same raw SQLite image).
4. **Burak's data**: a one-time migration via save export/import (server data/app.db -> browser IndexedDB).

## Teardown phase (once prerequisites are done)

- `/api/*` routes, `src/lib/jobs.ts`, `generation_jobs`-dependent flows, the T-040 auth gate (`src/lib/auth.ts` + the auth.test.ts route-walker), the server half of `requireLlm`, the IS_STATIC branches in `client-api.ts` (fetch paths get deleted, core calls stay).
- The Worker's auth/cloud-save routes STAY (they're not app runtime, they're backend); the `cloudAvailable`/`useAuthStatus` probes are unchanged.
- CLAUDE.md gets rewritten (the mode-split narrative goes away).

## Costs (accepted deliberately)

- Durable background jobs become tied to the tab's lifetime; the compensation is the T-068 open-time invariant check pattern.
- File-DB conveniences like `db:studio` operate on an exported snapshot instead.
- Ops habits centered on `data/app.db` (like blast) need review.

## Notes

- T-068 ships BEFORE this and independently of it; it's the first brick of the convergence since it moves orchestration policy into core.
- T-043 (self-host multi-tenant) effectively falls away / gets rescoped by this ticket: once the server runtime is gone, self-hosting = static files.

## Completion (2026-08-10)

Shipped as prerequisites commit ed7e8a0 + steps 1-8 (17eb1e3, 243af29,
cb74b6f, 1311c54, fa08312, runtime-purity walker, test-core-sqljs rename,
AGENTS.md rewrite). Deviations from the plan, both deliberate:

- src/core/jobs.ts was kept INTACT instead of stripped: cancelJob is a live
  dependency of core/curriculum-delete and the core-on-sqljs harness
  exercises the module; it is env-agnostic core, not server orchestration.
- src/lib/profile.ts was deleted in step 4 (not 3); its last importer was
  save/export.ts.

The auth.test.ts route-walker's successor is src/lib/runtime-purity.test.ts
(no node-only imports under src/ outside a justified allowlist). The
generation_jobs table stays as dead schema (a DROP would force a
SAVE_SCHEMA_VERSION bump). T-043 is rescoped by this ticket: with no server
runtime, self-hosting = serving static files.
