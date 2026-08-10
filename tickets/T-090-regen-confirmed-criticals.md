---
id: T-090
title: Regenerate the 28 verified-critical content items with sonnet
status: todo
priority: p1
effort: S
confidence: high
depends: []
created: 2026-08-10
---
T-023 verified 41 critical findings across 28 named items (see the error
tables in `tickets/T-023-audit-report.md`). Regenerate exactly these with
the content pipeline at sonnet tier (haiku forbidden), writing only to
`data/app.db`:

- zh vocab (9 + 1 words): 竟然, 脏, 悬念, 惭愧, 请示, 悔恨, 臂, 敬礼, 所以, 赔偿
- ja kanji (6 chars): 諒, 遇, 鷹, 啓, 棺, 朝 (plus 苑, whose tr examples all
  use 園; batch-level finding, same treatment)
- grammar topics: ja koto-tote, nante-nanka, made-mo-nai; zh you-you,
  tone-sandhi, buzhiyu; fr interrogative-pronouns, agreement-advanced
  (nl topics are covered wholesale by T-089)

Mechanism: set the rows' `status` appropriately for regeneration or call the
generation path directly per item; verify each regenerated payload against
the specific defect listed in the report (e.g. 竟然 examples must contain
竟然, 脏 must teach zāng "dirty", no markup fragments anywhere).

Scope guard: `data/app.db` only; no seed export, no deploy (T-092). Backups
exist (2026-08-10).

Acceptance: all listed items ready with the original defect verifiably gone;
zod-valid; a one-line before/after note per item.
