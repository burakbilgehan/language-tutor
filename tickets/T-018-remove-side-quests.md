---
id: T-018
title: Remove the side quest feature
status: done
priority: p2
effort: M
confidence: high
depends: []
created: 2026-07-18
---
Decision: side quests are being deleted. Main pages + Review practice already
cover the same ground; showing the same thing in a 5th form adds nothing.
This decision supersedes T-011 (nl/zh side quest backfill), making T-011
wontfix.

Surfaces to remove (grep: `side_quest|sideQuest|side-quest`):
- UI: the `/quest` page, quest nodes/entries in RoadmapView
- Server: the `/api/quests/[id]/start` route
- Core: `src/core/quest.ts`, quest generation in curriculum-gen, quest listing
  in roadmap.ts, the related part of llm-gen
- LLM: `src/lib/llm/prompts/side-quest.ts`, quest schemas in schemas.ts, quest
  instructions in the curriculum prompt + fixture update

**DB decision, note this**: the `nodes.side_quest_payload` column and
quest-typed `nodes` rows can stay in the schema (dead data). Dropping the
column means a `SAVE_SCHEMA_VERSION` bump and old saves getting rejected on
import, a cost for zero benefit. Recommendation: don't touch the schema, only
remove code/UI/prompt; filter existing quest nodes out of the roadmap query.
Schema cleanup can happen later if it rides along with some other required
bump.

Verification: generate a new curriculum in fixture mode (quest-free), the
roadmap/complete flow should work with the existing DB, `npm test` + the
parity harness (`scripts/test-sqljs-parity.ts`, core is changing).
</content>
