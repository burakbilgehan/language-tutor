# T-023 audit progress (live; delete after the audit)

Read-only content quality audit. Sample: 470 items, deterministic (seeded),
level-balanced, drawn from `data/app.db`. Auditors: Opus subagents; definite
errors get a second adversarial verification pass before entering the report.
Final report: `tickets/T-023-audit-report.md`.

Last update: 2026-08-10. ALL WAVES DONE; final report written to
`tickets/T-023-audit-report.md`. This progress file can be deleted.

| Wave | Surface | Sample | Batches | Status |
| --- | --- | --- | --- | --- |
| 1 | zh vocab | 200 words | 8 x 25 | done (findings: 13 critical / 200 major / 455 minor / 71 suspicious) |
| 2 | ja kanji | 100 chars | 4 x 25 | done (findings: 25 critical / 62 major / 112 minor / 38 suspicious) |
| 3 | grammar ja/zh/nl/fr | 50+50+40+30 | 8 | done (findings: 25 critical / 125 major / 197 minor / 93 suspicious; nl dirtiest: 9c/52M on 40 topics) |
| 4 | conjugation tables (static code) | full ja/zh/nl | 3 | done (zh clean 0c/0M; ja 2c/3M; nl 3c/4M) |
| 5 | verification (all 68 criticals + 57-of-394 major sample) + report | - | 5 | done (68 criticals: 41 confirmed, 27 downgraded, 0 refuted; major precision ~81%) |

## Batch log

(one line per finished batch: counts of critical / major / minor / suspicious;
counts are FINDINGS, not items; one item can carry several findings; raw counts
are pre-verification, the report will re-grade them)

- vocab-zh-08: checked=25 critical=2 major=25 minor=48 suspicious=7
- vocab-zh-03: checked=25 critical=3 major=35 minor=79 suspicious=12 (clean: 0)
- vocab-zh-06: checked=25 critical=2 major=24 minor=93 suspicious=9 (clean: 0)
- vocab-zh-05: checked=25 critical=1 major=23 minor=30 suspicious=7 (clean: 2)
- vocab-zh-02: checked=25 critical=2 major=17 minor=61 suspicious=8
- vocab-zh-01: checked=25 critical=0 major=22 minor=98 suspicious=10
- vocab-zh-04: checked=25 critical=1 major=31 minor=23 suspicious=12 (悬念: leaked tool-call markup stored in note_tr)
- vocab-zh-07: checked=25 critical=2 major=23 minor=23 suspicious=6 (clean: 1)
- kanji-ja-03: checked=25 critical=2 major=10 minor=16 suspicious=6 (clean: 10)
- kanji-ja-04: checked=25 critical=3 major=9 minor=24 suspicious=5 (clean: 3)
- kanji-ja-01: checked=25 critical=9 major=16 minor=25 suspicious=13 (clean: 3)
- kanji-ja-02: checked=25 critical=11 major=27 minor=47 suspicious=14 (苑: all 6 tr examples use 園 instead; 諒: fabricated compounds)
- grammar-fr-02: checked=15 critical=3 major=15 minor=23 suspicious=14 (CEFR level placement clean)
- grammar-fr-01: checked=15 critical=3 major=6 minor=20 suspicious=8 (clean: 1)
- grammar-nl-01: checked=20 critical=8 major=20 minor=34 suspicious=12
- grammar-zh-01: checked=25 critical=3 major=8 minor=16 suspicious=8
- grammar-nl-02: checked=20 critical=1 major=32 minor=30 suspicious=14 (clean: 1)
- grammar-ja-02: checked=25 critical=3 major=11 minor=29 suspicious=9
- grammar-ja-01: checked=25 critical=3 major=18 minor=25 suspicious=16
- grammar-zh-02: checked=25 critical=1 major=15 minor=20 suspicious=12
- conj-zh: critical=0 major=0 minor=6 suspicious=5 (Chinese sound; label/copy slips only, incl. 2 em dashes)
- conj-nl: critical=3 major=4 minor=5 suspicious=5
- conj-ja: critical=2 major=3 minor=3 suspicious=5
- verify-kanji: 25 critical claims => 11 confirmed critical, 11 downgraded to major, 3 minor, 0 refuted
- verify-zh: 17 critical claims => 13 confirmed critical, 3 as major, 1 minor, 0 refuted
- verify-ja-fr: 14 critical claims => 8 confirmed critical, 4 as major, 2 minor, 0 refuted
- verify-nl: 12 critical claims => 9 confirmed critical, 3 as major, 0 minor, 0 refuted (conj claims verified by running conjugateNl)

## Interim signal (2026-08-10, wave 1 partial)

Two batches in and the picture is already clearly dirtier than the 07-18 kanji
leg. Dominant failure modes so far: (1) fabricated character-etymology hints
(invented radicals/components in `chars[].hint_tr`, sometimes tr and en payloads
contradicting each other); (2) a mechanical class of pinyin typos in bracket
notation (wrong tone/syllable, doubled letters like `yuánnzé`). The second class
would be catchable by a non-LLM validator (hanzi-to-pinyin table).

