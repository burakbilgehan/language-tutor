---
id: T-007
title: Kanji N1 queue (997 characters)
status: wontfix
priority: p3
effort: S
confidence: high
depends: []
created: 2026-07-17
---
N1 stalled at 235/1232. Ops work: a single command, ~3 hours (haiku, c=4).
Low value: the user is at N4 level, N1 is years away; when needed,
`POST /api/kanji/generate-batch {"level":"N1"}` is enough.
Haiku quality confirmed (25/25 sample accurate), no model concerns.

**in-progress (2026-07-18)**: blast-generate is running with conc=8-16
(1355+ ready, ~570 remaining). Continue from the panel
(`node scripts/blast-dashboard.mjs`) in the next quota window, it finishes
in the same run as vocab.

**wontfix-as-ticket (2026-07-18)**: content generation is ops work, not
backlog work; it runs via the blast panel (`node scripts/blast-dashboard.mjs`),
the remaining ~570 N1 finish together with vocab in the next quota run.
Ticket closed.
