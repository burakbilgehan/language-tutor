---
id: T-003
title: Remaining grammar generation (zh 99 + ja 16)
status: done
priority: p1
effort: S
confidence: high
depends: []
created: 2026-07-17
---
Left over when the quota window ended: zh 85/184, ja 282/298. Once the weekend
quota refreshes, close it out in one pass (~1 hour, c=3):

    # worker: LLM_CONCURRENCY=3 PORT=3210 npm run dev -- --port 3210
    # while active: POST /api/grammar/generate-batch {} (ja on the active profile)
    # for zh: switch -> batch -> switch back (see the flow in git log)

Jobs in error don't revive automatically; the batch call is required. Do NOT
start the kanji N1 queue (T-007, low value).

**done (2026-07-18)**: today's blast runs closed it out. grammar_topics is
554/554 ready, zero pending/error. `seed:grammar` re-export is pending
(background pipeline, after T-023 QA).
