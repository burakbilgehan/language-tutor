---
id: T-068
title: Lesson prefetch window: the "if active lesson is n, stay ready through n+2" invariant (both modes)
status: done
priority: p1
effort: M
confidence: high
depends: []
created: 2026-07-31
---

## Problem

2026-07-31, live (okumo.dev, static mode): after Burak finished "Family Terms" and clicked the next lesson on the map, the "Preparing your lesson" screen ate him. The repeatedly requested behavior: lessons should be buffered in the background, so the next one is READY the moment it opens.

Root cause: open-time prefetch exists in server mode (`/api/nodes/[id]/open` -> `prefetchSuccessorLessons(nodeId, 3)`), but was NEVER written for static mode (`openNodeApi`'s static branch, `client-api.ts` ~1005). Static only generates the direct successor at completion time; the gap between completion and the click is 5-10s, generation takes 1-3 minutes - the window is always missed.

## Spec (Burak, 2026-07-31)

Invariant: if the active lesson is n, then n+1 and n+2 must have content.
- The last opened lesson is 5 -> 6 and 7 get generated in the background.
- Next-day site visit: if 6-7 are ready, ZERO new generation.
- The moment 5 finishes and 6 becomes active, check up through 8; if 7 is already ready, only 8 is generated.
- If the user quickly moves to 7, active becomes 7 -> 8-9 get pulled.

## Design (2026-07-31 analysis, approved)

- Core: a pure function in `src/core/`, `lessonWindowTargets(db, activeNodeId, k=2)` - walks the prereq chain forward over main-type nodes and returns the ids of the ones without content (EXCLUDING status `error`: no automatic retry, so a broken prompt doesn't burn budget forever in the background). If everything's ready, returns an empty list = zero LLM calls. Covered by the parity harness.
- Three triggers (same in both modes):
  1. Lesson open: `targets(n)`.
  2. Lesson completion: `targets(new active = successor)`.
  3. App/map open: once, from the frontier (the first incomplete main node) - in static mode this quietly recovers any in-flight generation that died when the tab closed; if the window is already full, it's a no-op (the "don't re-fetch on revisit" rule is preserved).
- One executor line per mode: server `forEach(ensureLessonJob)`, static `forEach(id => void ensureLessonGen(id))`. Dedup exists on both sides already.
- The server's depth-3 open prefetch narrows to this spec (k=2).
- Auto-extend behavior is unchanged; the window just shortens at the end of the chain.

## Out of scope

- Early chapter-level triggering at the edge of the window.
- Durable job records / resume in static mode (solved in T-069's world; the open-time trigger here is the practical stopgap).
