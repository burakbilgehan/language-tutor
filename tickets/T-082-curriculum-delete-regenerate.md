---
id: T-082
title: "Curriculum delete + regenerate with starting level; per-lesson delete"
status: done
priority: p1
effort: M
confidence: medium
depends: [T-079]
created: 2026-08-05
---

## Problem

A garbage curriculum (the current Dutch one) cannot be thrown away; a bad
lesson can be regenerated with feedback (T-022) but not discarded outright.
Ruling (Burak, 2026-08-05): both must exist, with guards against
accidental clicks.

## Work

- **Delete whole curriculum** (Settings): wipes the profile's curriculum,
  chapters, units, nodes and cached lessons. Double-confirm guard (explicit
  confirmation step, e.g. typed confirmation or a two-step dialog). XP,
  streak, SRS cards, attempts and stats are profile-level and survive;
  state this in the confirm dialog so the user knows exactly what is lost.
  **Amended 2026-08-06 (implementation): "attempts survive" no longer
  applies.** It is not implementable: `attempts.exerciseId` is NOT NULL and
  the chain above it (exercises -> lessons -> nodes -> units -> curricula) is
  NOT NULL at every step, so deleting the curriculum necessarily deletes the
  attempt rows scored against it. XP already awarded for those attempts is
  independent (`xp_events` is keyed on profileId) and does survive. The
  confirm dialog lists answer history under "will be deleted" rather than
  promising otherwise. See the Resolution below.
- **Regenerate with starting level**: after delete (or as one combined
  flow), ask "which level to start from" (the profile scheme's levels,
  CEFR A1-C2 / JLPT / HSK). Chosen level = the first chapter generated;
  earlier levels are simply never generated. Uses the T-079 pipeline (and
  T-080's two doors if that has landed).
- **Per-lesson delete**: next to the existing regenerate-with-feedback,
  a "discard this lesson" action (confirmed): clears the cached lesson
  content so the node regenerates fresh on next open. Node completion
  state is not touched.
- Both modes (server routes + `src/core/*` for static), per the seam rule.

## Notes

- Starting-level granularity is chapter-level only; starting mid-level
  ("lesson 17 of 156") needs placement logic and is deliberately deferred
  (T-083).
- Deletion must not orphan generation jobs: cancel/ignore in-flight jobs
  for deleted refs (see `createJob` dedupe semantics).

## Resolution (2026-08-06)

Shipped in wave C3. Core: `src/core/curriculum-delete.ts` with
`deleteCurriculum(db, profileId)` and `discardLesson(db, nodeId)`; routes are
thin shells (`DELETE /api/curriculum`, `DELETE /api/nodes/[id]/lesson`), static
mode calls the same functions through `client-api`'s `IS_STATIC` seam
(`curriculumDelete` / `lessonDiscard`, both `persistNow()` since they are
destructive). NO schema change, NO save-format change, NO
SAVE_SCHEMA_VERSION bump.

Deletion runs in ONE transaction, child-to-parent, because foreign keys are
enforced in both runtimes: attempts -> exercises -> lessons -> nodes -> units
-> chapters -> curriculum. Atomicity is load-bearing rather than cosmetic: a
single surviving unit/node leaves a prereq-chain tail, so the regenerated
curriculum's head node is created `locked` and the map is dead with no error
anywhere.

Survives: XP, streak, SRS cards, the grammar/kanji/vocab libraries (language-
wide, merely seeded during chapter generation), llm_calls, the profile row and
`profiles.curriculum_pedagogy` including a hand-edited T-080 body. Dies:
the curriculum graph, cached lessons, their exercises, and their attempts
(see the amendment above).

Regenerate with a starting level: `POST /api/curriculum/generate` gained an
optional `level`; absent = the scheme's first level, so every existing caller
is byte-for-byte unchanged. The level travels in the chapter job's refId
(`${profileId}:${level}`), which `runChapterJob` already parses, and
`generateChapter` already accepted an explicit level. Auto-extend needed no
change: it chains from `topChapterLevel` + `nextLevelFor`, so a curriculum
started at B1 extends to B2 (asserted in the e2e script).

In-flight jobs: queued/pending rows for the profile are cancelled via
`cancelJob` (which DELETES them, releasing `createJob`'s (jobType, refId)
dedupe lock so a same-level regenerate enqueues a job something actually
drives). A **running** chapter job REFUSES the delete (`curriculum_job_running`,
409): the CLI child cannot be killed and its writer resolves the curriculum by
profileId, so it would append a stale chapter into the freshly regenerated one.
`discardLesson` is looser by design; a running lesson job is flipped to
`cancelled` because its writer only upserts that one node's lesson.

An adversarial review pass attacked the six load-bearing claims (no breaking
orphans, FK-safe order, exactly one `available` head, static persistence,
guarded UI, `requireAuth` first); all survived, and it surfaced one real
defect. `curricula` has no unique index on `profile_id`, so one-per-profile is
convention (a single guarded insert site) rather than structure; the delete
resolved with `.limit(1)` and would therefore have left a duplicate's units and
nodes behind, producing exactly the locked-head dead map described above. It
now deletes every curriculum row for the profile. Adding the unique index would
be the structural fix but forces a SAVE_SCHEMA_VERSION bump, so it is
documented in the module instead. Known-dangling, verified harmless:
`srs_cards.sourceLessonId` (written, never read), `chat_sessions.contextNodeId`
(null-guarded at its one dereference) and `xp_events.refId` (no consumer).

Verified: `npm test` (250 pass, 15 new in `src/lib/curriculum-delete.test.ts`
against a real better-sqlite3 DB built from the shipped DDL with
`foreign_keys = ON`, so an out-of-order delete would fail there), the auth
walker, `npm run build:static`, the sql.js parity harness (unchanged, and it
leaves the copied DB byte-identical), and `scripts/test-t082-e2e.ts` (25
assertions on the sql.js driver: generate -> discard -> delete -> regenerate at
B1 -> extend to B2, asserting exactly one `available` head node afterwards).
Real-browser click-through of both surfaces was not performed; that stays
manual.

Deliberately not covered: T-080's Customize door is not wired into the
Settings regenerate flow. It is reachable one step later on the map (the
`notReady` card offers both doors once the curriculum is gone), and the stored
pedagogy body is reused by the regenerate anyway, so the wording is editable
without duplicating the customizer into Settings.

Known gap, deliberate: the starting level is choosable ONLY in the Settings
flow, which deletes and regenerates as one action. The map's `notReady`
recovery card still calls `curriculumGenerate` with no level (the scheme's
first), which is its pre-T-082 behavior. So a user who deletes in Settings and
then hits an error before generation starts, or who reaches the map card by
another route, regenerates from the first level. Adding a level picker to that
card is a small follow-up; it was left out rather than duplicating the
Settings panel's guard copy into the map.
