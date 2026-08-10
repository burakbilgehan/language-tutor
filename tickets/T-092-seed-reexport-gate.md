---
id: T-092
title: Seed re-export + deploy after content repair (owner-gated)
status: backlog
priority: p1
effort: XS
confidence: high
depends: [T-086, T-087, T-088, T-089, T-090, T-091]
created: 2026-08-10
---
Final gate of the T-023 cleanup. Only after the repair tickets land and
Burak explicitly approves:

1. `npm run seed:grammar && npm run seed:kanji && npm run seed:vocab`
   (re-exports the repaired `data/app.db` content to `public/*-seed/`).
2. Commit + push (deploy is automatic via `.github/workflows/deploy.yml`).

Until then the live site keeps serving the current (known-imperfect) seeds;
that is deliberate, per the audit decision to change nothing in production
before the repair is reviewed. Do NOT run the exports as part of any other
ticket; this step exists so that no agent ships repaired-but-unreviewed
content by reflex.

Acceptance: seeds regenerated from the repaired snapshot, zod-valid, diff
reviewed by Burak before push.
