---
id: T-071
title: Split lesson generation: a fast skeleton + exercises completed in the background (lazy load)
status: todo
priority: p1
effort: L
confidence: medium
depends: []
created: 2026-08-01
---

## Problem

A single Sonnet call generates the whole lesson (explanation + examples + 10+ exercises + accepted-answer variants, 6-9k characters) in one shot: 90-190s, with queued cases hitting 180s+. User perception (2026-08-01, Burak): "a lesson that takes 187 seconds is pretty small content; waiting 3+ minutes doesn't make sense." Prefetch hides this duration, but it's felt raw on first open and whenever the window is empty.

## Approved direction (Burak, 2026-08-01)

Two-stage generation; the same split applies BOTH on user open AND on prefetch:

1. **Skeleton call** (fast, target 30-40s): lesson title/explanation/examples
   + the first ~3 exercises. The moment this returns, the lesson OPENS; the user starts working.
2. **Completion call** (in the background): the remaining exercises + accepted-answer variants. Once done, it's appended to the lesson; seamless if the user isn't done with exercise 3 yet, otherwise a "preparing more" placeholder at the end of the exercise list.

In prefetch, the two pieces are also generated in sequence (skeleton first: the window should pull both lessons' SKELETONS before their completions - so even in the worst case, the next lesson is at least "openable").

## Design questions (decide before implementing)

- Content schema: adding partial state to `LessonContent` must NOT require a SAVE_SCHEMA_VERSION bump. Candidate: an `exercises` map plus an optional `pendingExercises: true` flag (an optional zod field keeps old records valid); the completion call clears the flag.
- Two calls = two prompts: the completion call must see the skeleton's exercises
  (to avoid repeats/overlap), but must NOT regenerate the whole explanation.
- Interruption: skeleton exists + completion dies -> the lesson still opens, with a retry button at the end of the exercise list (the T-070 error-surface pattern). Should the window invariant distinguish "has a skeleton" from "fully complete"? (suggestion: target list prioritizes skeleton-less lessons first, then incomplete ones.)
- Cost: call count doubles, but total tokens are similar; to ease queue pressure, completion calls are always non-urgent.

## Out of scope

- Streaming/SSE (incompatible with the whole-document zod validation model; this ticket solves it via call-splitting instead).
- Grammar/kanji/vocab generation (already small and single-shot).
