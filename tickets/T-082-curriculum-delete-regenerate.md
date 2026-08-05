---
id: T-082
title: "Curriculum delete + regenerate with starting level; per-lesson delete"
status: todo
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
