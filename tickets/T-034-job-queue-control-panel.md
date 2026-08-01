---
id: T-034
title: Job queue control panel, visibility + cancel + boot-time confirmation
status: backlog
priority: p1
effort: L
confidence: medium
depends: [T-024]
created: 2026-07-22
status_note: done 2026-07-22 (branch t-034-job-queue-panel); core/jobs.ts
  (env-agnostic list/cancel/cancelAll/resume, no-bump), src/lib/jobs.ts boot
  recovery now marks orphan queued -> pending_approval (no auto-run), 4 routes
  (GET /api/jobs, cancel, cancel-all, resume-pending), browser store
  (jobs-store.ts + client-api seam onJobsChange), JobQueuePop (global) +
  JobQueuePanel (settings). Kanji auto-fill left as-is (panel makes it
  visible/cancellable; original concern resolved). tsc/test/parity all green.
---
Context: the user has zero control over the background LLM queue.
Concrete pain points (Burak):
1. Grammar/kanji/vocab "generate all" -> no way back, **no cancel**. A
   batch started by mistake can't be stopped.
2. A user who clicks "download" then navigates away **forgets** the job
   -> a queue is left silently burning tokens in the background, unaware.
3. On boot, `recoverStaleJobs` (`src/lib/jobs.ts:76-94`) **unconditionally
   adopts and auto-runs** pending queued jobs; correct for crash
   recovery, surprising for an imported/forgotten queue. T-024 only
   patches this AT import time (belt-and-suspenders); it doesn't protect
   a user who continues (from localStorage/IndexedDB) without hitting
   import again.

Reference experience: `scripts/blast-dashboard.mjs` (:4646); active/
pending/finished job list, live status. Give the end user the same
control.

Decision (Burak): T-024's existing fix (export strip + import belt) is
temporarily sufficient; it closes the main vector for a surprise queue.
This ticket is the permanent, full fix.

Work; two-part placement (Burak's decision):
1. **Global bottom-right popover** (right above the existing running-cost
   summary, visible from EVERY page): active/pending job count + "stop
   all". Invisible/minimal when there's no active work. Awareness
   everywhere.
2. **Full panel in Settings** (blast-dashboard clone): job list
   (jobType/refId/status/start time), individual cancel + bulk cancel,
   finished/errored history. Detail lives here.
3. **Cancel path**: queued -> delete (also releases the dedupe lock);
   running -> mark as canceled (killing the CLI child may be hard; at
   least don't run the next step, add a cancel-check to `runJob`). New
   route: `POST /api/jobs/[id]/cancel` + `POST /api/jobs/cancel-all`.
   Core gets `cancelJob`/`cancelAllJobs` (env-agnostic, `src/core/*`),
   route stays a thin shell. Static mode also needs a stop mechanism for
   the inline batch (an Abort signal); closing the tab already kills it,
   but a manual stop should exist too.
4. **Confirmation instead of auto-run on boot**: remove the
   queued-adoption step from `recoverStaleJobs`'s automatic `runJob`;
   mark the pending queue as "recovery pending" and show "N jobs waiting,
   continue?" in the panel. Crash recovery is preserved (manually
   triggered), the surprise auto-run ends. **Behavior change**, note it
   in the commit.
5. Server + static mode parity (`client-api.ts` seam, `src/core/*`).
   Parity harness runs whenever core is touched.
6. i18n: tr canonical + en mirror (co-located `S` table).

Note; kanji list GET auto-fill (deferred in T-024's sub-decision): once
this panel exists, the auto-fill queue also becomes visible/cancellable;
the separate "move to user-triggered" decision may no longer be needed.
Revisit while implementing the panel.

Review additions (backlog session, 2026-07-22):
7. **No list endpoint**: only `[id]` exists under `/api/jobs/`. The pop +
   panel need `GET /api/jobs` (active/pending + last N history); light,
   no LLM; the pop polls this (the roadmap's 4s pattern is precedent).
8. **Static-mode data source**: the job table isn't used there at all;
   batch is an inline loop inside client-api. The pop/panel in static
   mode should be fed from an in-browser queue store (module-level state
   + subscribe, cancel via AbortController); `GET /api/jobs` is
   server-mode only. Seam again is client-api.
9. **"Recovery pending" flag is a schema trap**: adding a new COLUMN
   changes the `generation_jobs` shape, forcing a SAVE_SCHEMA_VERSION
   bump + rejecting old saves. A new VALUE on the existing text `status`
   column (e.g. `pending_approval`) doesn't require a bump
   (`gradedBy:"self"` precedent). Go with the new value; an old app
   version simply won't recognize it and won't run it; the safe
   direction.
10. **System work != user batch**: prefetch (ensureLessonJob) and
   auto-extend also feed into this queue. Label them in the panel
   (system/user); "stop all"'s default should target user batches; 
   otherwise a user will see normal lesson prefetch, cancel it, and
   complain that node opens got slower.
11. **The distinction will be made WITHOUT a column** (same trap as item
   9: a "source" column = a shape change = a SAVE_SCHEMA_VERSION bump,
   not worth it): coarse classification via jobType; lesson/chapter =
   system (prefetch/auto-extend), grammar/vocab/kanji = user batch. The
   "user opened it" vs "prefetch" distinction is lost for lessons;
   accepted; the pop shows a total count, the jobType label in the panel
   is enough.

Verification: start "generate all" -> see it in the panel -> cancel ->
queue stopped, token flow cut off (llm_calls stops growing); navigate to
another page -> global pop shows the active job; boot with a dirty save
imported without clicking import -> no job auto-runs, panel offers
"continue?"; parity ALL PASS.
