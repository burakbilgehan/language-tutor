---
id: T-073
title: Cancel must stick: a canceled lesson must not auto-regenerate
status: todo
priority: p1
effort: S
confidence: high
depends: []
created: 2026-08-01
---

## Incident (2026-08-01, live)

The user hit Cancel on the "preparing" screen; the panel closed and a new generation started THE SAME SECOND (bridge log: 16:10:13 cancel + 16:10:13 request, same job id). The user's explicit cancel is being ignored.

## Root cause (confirmed by reading the code)

1. `LessonPlayer.tsx` sets up an `open()` poll every 3s while "generating" (around line
   271). When Cancel reverts the row to "pending", the poll's next tick hits `openNodeApi` -> `needsGeneration` -> `ensureLessonGen(urgent)`, restarting generation.
2. `client-api.ts openNodeApi`: the "don't generate if cancelled" check sits
   AFTER `await ensureLessonGen` (around line ~1182) - by then it's too late. The store's "cancelled" record isn't `running`, so `startLessonGen` allows a new generation.
3. `open()` still runs after unmount: `stopped.current` only gates `setData`,
   not the (side-effecting!) `openNodeApi` call itself.

## Desired behavior

- A DELIBERATELY canceled lesson must not be regenerated automatically through
  ANY path (poll, the T-068 window, the map open trigger) during that SESSION. Regeneration only happens through an explicit user action (reopening the lesson / retry). Note: the window's target filter (the cancelled skip inside `runLessonWindow`) already exists; what's missing is the openNodeApi + poll layers.
- Auto-prefetch firing on newly opened nodes right after finishing a lesson is
  CORRECT behavior and stays as is (`completeNodeApi` -> the runLessonWindow chain).

## Fix sketch (keep it simple)

- In `openNodeApi`'s needsGeneration branch, move the
  `lessonGenState(nodeId)?.kind === "cancelled"` check to BEFORE ensureLessonGen; if cancelled, return a result representing the cancellation without starting generation, instead of `{status:"generating"}` (the caller already returns it to the map).
- The `open()` poll callback: if `stopped.current` OR the store says "cancelled",
  bail out without ever calling openNodeApi; clear any pending setTimeout in the unmount cleanup.
