---
id: T-011
title: Side-quest backfill for existing nl/zh profiles
status: wontfix
priority: p2
effort: S
confidence: high
depends: []
created: 2026-07-18
---
Bug (surfaced by a parity test, root-caused on 2026-07-18): the "side quests
are only created once" check during chapter generation looked at the ENTIRE
nodes table instead of the curriculum, so the ja profile's 5 quests suppressed
quest creation on the nl and zh profiles. `src/core/curriculum-gen.ts` now
scopes the check to the curriculum; NEW profiles get their quests.

Remaining: existing nl/zh profiles still have 0 side quests, and since the
append flow isn't `isFirst`, it doesn't retroactively create them. Needs a
backfill: either a lazy self-heal (on roadmap open, if the curriculum has no
side_quest at all, generate one for the first chapter via the LLM) or a
one-off script. Self-heal is preferred, it also fixes older records restored
via save import. Requires an llmConfigured gate + job dedupe since it needs an
LLM call.

**wontfix (2026-07-18)**: the side quest feature is being removed entirely
(T-018, user decision). No longer applies; superseded by
[T-018](T-018-remove-side-quests.md). The backfill became moot.
