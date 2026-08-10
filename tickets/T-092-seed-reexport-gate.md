---
id: T-092
title: Seed re-export + deploy after content repair (owner-gated)
status: done
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

## Result

Done 2026-08-10 ~22:05. All three exports run against the repaired
`data/app.db` (post T-089/T-090 regeneration + T-091 mechanical round),
zod-validated at export time. 15672 items total, 3838 changed vs. the
previously shipped seeds. Owner-reviewed diff summary:

- nl grammar: all 72 topics replaced (both tr and en), zero readings.
- Em dash: zero in every grammar and kanji seed; vocab residual (1235 tr /
  1536 en) sits in the dead `chars[].hint_tr` field (not rendered since
  T-088), deliberate skip per T-091.
- Markup leaks: 31 -> 0 corpus-wide.
- Cyrillic: ja grammar 4 -> 0 (koto-tote); remaining 61 occurrences across
  zh/fr grammar + zh vocab belong to the T-093 LLM leg.
- manghua-style pinyin: 106 -> 40 occurrences; remainder lives in long-host /
  unpaired brackets and hint_tr, also T-093.

Deploy: push executed by the owner (deploy.yml auto-deploys okumo.dev).
