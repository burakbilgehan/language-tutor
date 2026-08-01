---
id: T-070
title: Lesson generation failure black hole: bridge 180s timeout + swallowed error + uncancelable/unretryable "preparing"
status: done
priority: p1
effort: M
confidence: high
depends: []
created: 2026-08-01
---

## Incident (2026-08-01, live, okumo.dev static mode)

Burak opened the "Counters" lesson; the bridge log showed `ERROR: claude timeout (180s)`. The site was stuck on an infinite "Preparing your lesson": no visible error, no cancel, no retry, doesn't show up in a queue either. Restarting the bridge didn't change anything.

## Root cause chain (all CONFIRMED via code reading + fable-verifier)

1. **The bridge's default timeout is 180s, which sits INSIDE the lesson generation time distribution.**
   `scripts/llm-bridge.mjs:62` defaults to 180s -> SIGKILL (:197) -> HTTP 500
   (:373). The app passes `timeoutMs=300_000` for lesson generation
   (`core/llm-gen.ts:149`). The owner's own `llm_calls` data (lesson+lesson-retry, balanced, n=80) shows: **20% exceed 180s**, 48% exceed 150s, max 255s. So with the default bridge, roughly one in five lessons dies. The wizard's setup command (`LlmSetupWizard.tsx:757`) doesn't pass `--timeout`; everyone is stuck at 180s.

2. **An error arriving while the drawer is closed is swallowed entirely.**
   `LessonPlayer.tsx:244-247`: `catch { if (!stopped.current) setError }`.
   Closing with "Close (generation continues in background)" unmounts 500ms later
   (`RoadmapView.tsx:240-247`); by the time the rejection arrives, the error has nowhere to surface: the map's `getRoadmap` never SELECTs lesson status at all
   (`core/roadmap.ts`), there's no toast system, `genError` only covers the curriculum path, `useLlmStatus` looks at config not outcome, and static mode has no job table. The lesson row does get written with `status:"error"`, but `openNode` doesn't distinguish error from pending
   (`core/lesson.ts:88-92`) -> reopening silently kicks off a brand-new 3-minute (and again 180s-doomed) generation. From the user's perspective: an endless "preparing." If the same node is still in flight, `ensureLessonGen` (client-api.ts:159) shares the same promise, so no new request even reaches the bridge.

3. **Even when the error screen shows, there's still no retry** (`LessonPlayer.tsx:288-298`
   only has an exit button; the same file's grade-error block at :685-705 already does retry+skip).

4. **The timeout 500 collapses into a generic message.** Since the bridge is still up,
   `classifyGenerationFailure` returns `local_up_other_cause`; the `claude timeout (180s)` text inside the 500 body never reaches the user
   (`browser-provider.ts:157` throws LlmError, not LlmTimeoutError).

5. **No priority:** the user's own opened lesson waits in the same concurrency=1 queue as prefetch generations, with no `urgent` flag (`browser-provider.ts:66`, `llm-gen.ts:143`); the bridge's own serialize() also has no priority concept. This becomes visible once T-068 adds boot/open-time prefetch.

## Fix plan (same wave as T-068)

- **A. Bridge:** extend the timeout for lesson/curriculum calls on request - either raise the default to 300s+, or have the app pass an `X-Bridge-Timeout` header/body field; make the timeout response distinguishable (e.g. 504 + `{error:
  {type:"timeout"}}`) -> browser-provider throws `LlmTimeoutError`, so diagnosis prints the correct message. Update the wizard command/`--timeout` docs. (Bridge version compatibility: behavior must not change for an older bridge.)
- **B. Error surface:** the generation result no longer binds to the component's lifetime -
  `ensureLessonGen`'s result (ready/error+message) is written to a module-level
  store/event; LessonPlayer reads the last known state on mount, and an error that finishes while the drawer is closed shows up on the map, on/near the node badge. `openNode` returns `lessonStatus:"error"` distinctly: no automatic silent retry, instead a "generation failed, try again" screen (message + retry button).
- **C. "Preparing" screen:** an elapsed-time indicator + cancel (an AbortController threaded into ensureLessonGen) + a diagnosis message and "Try again" on failure.
- **D. Priority:** a user-initiated open is `urgent:true` (not prefetch);
  T-068's executor enqueues prefetches without urgent.
- **E. Visibility (the static half of T-034, minimum):** in-flight browser
  generations (lessonGenInFlight + queue) are listed on a small surface;
  an in-memory list is enough until T-069 brings durable job records.

## What actually shipped (2026-08-01)

- A/B/C/D fully; E **partially**: instead of a separate "generation panel" surface, visibility shipped as a per-node badge on the map (preparing / failed).
  `runningLessonGens()` and `llmQueueDepth()` were exported but currently have
  NO CONSUMER; they're ready if a bulk-list surface (T-034's static half) shows up.
- Store-backed surfaces (cancel button, elapsed time, badges) and `urgent` are **static-mode only**: `startLessonGen` sits behind the `IS_STATIC` branch at every call site; the server's `generateLessonContent` call carries no opts bag. Server mode gets the error-status distinction + the retry screen (the infinite poll ends there too).
- Cancel stamps the DB row "pending", not "error"; the window prefetch skips a canceled lesson for the rest of the SESSION (kept in the in-memory store), and it becomes a target again after a reload.

## Out of scope

- Durable job records/resume in static mode (T-069).
- The prefetch window invariant itself (T-068; runs alongside this).
