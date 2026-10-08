---
id: T-099
title: Japan travel sprint (map units) + offline travel phrasebook (/travel)
status: done
priority: p1
effort: M
confidence: high
depends: []
created: 2026-10-08
---
Owner (2026-10-08): Japan trip 7-29 November 2026, one month away. Wants an
accelerated tourism curriculum on top of the live ja profile without losing
progress, and something that helps on the ground.

## A. Travel sprint on the map

- Authored skeleton: `src/lib/curriculum/travel-sprint-ja.ts`, 7 units /
  33 nodes (survival, transport, lodging, food, shopping, sightseeing,
  emergencies), tr + en titles/objectives.
- `src/core/travel-sprint.ts` `insertTravelSprint`: splices the units in
  front of the frontier node's unit. Additive only: new rows, unit position
  shift, ONE prereq relink (frontier now follows the sprint tail). Completed
  nodes stay completed; the old frontier keeps its status. Appends after the
  tail when everything is completed. Idempotent (`travel_sprint_exists`).
  No schema change, no save bump.
- Map card (`RoadmapView`, ja only, until added) calls client-api
  `travelSprintInsert`, then primes the lesson window.
- Lesson prompt: units themed `travel-sprint:*` get travel rules (chunks over
  grammar sequence, staff keigo to understand, signage, a dialogue, a
  culture tip, situational exercises).
- Tested: `src/lib/travel-sprint.test.ts` (better-sqlite3) and a one-off
  sql.js run against a copy of `data/app.db` (38 completed nodes preserved,
  frontier moved to the sprint head).

## B. /travel phrasebook

- Static data `src/lib/travel/phrasebook-ja.ts` (7 sections + 40 signs),
  furigana + explicit romaji + tr/en, TTS via SpeakButton, search across
  everything. Nav item `jaOnly`. Part of the precached shell (T-095), so it
  opens in airplane mode.

## Owner usage plan (not code)

1. Days 1-3: SRS review backlog + finish the in-progress lesson.
2. On the map, "Haritama ekle" once (laptop, bridge running, quality
   profile "En iyi" so lessons run on Opus).
3. Roughly 1.5 sprint lessons a day until 6 November; the lesson window
   prefetches the next two.
4. Before flying: open every sprint lesson once (cached), cloud push from
   the laptop, cloud pull on the phone. Offline grading falls back to
   self-check.

## Deliberately not done

- No "add to SRS" button on /travel: sprint lessons already feed their
  vocab into SRS.
- No pre-generated lesson seed: lessons are per-profile and use the
  learner's history; they are generated on the owner's device.
