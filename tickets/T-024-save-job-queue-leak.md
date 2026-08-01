---
id: T-024
title: Job queue must not leak into save files (imported save burns tokens)
status: done
priority: p1
effort: S
confidence: high
depends: []
created: 2026-07-22
---
Root cause (found in the 2026-07-22 backlog session): if a save export is
taken mid-batch generation ("download all"), the `queued`/`running` rows in
the `generation_jobs` table get embedded in the snapshot. Every session that
imports the save hits `recoverStaleJobs`'s orphaned-queued-job adoption step
(`src/lib/jobs.ts:76`) and starts running the queue on its own, burning the
user's LLM tokens without their knowledge. The behavior that's correct for
crash recovery is wrong for an imported save.

Note: in the live (static) mode the job table isn't used, batch runs inline
in browser memory and stops when the tab closes. The leak only comes from
server-mode exports.

Decision (Burak): the information should never be written to the save file at
all, the cleanup happens on the export side.

Status (2026-07-22): 1+2 done (export strip + import belt). This is a
**temporary but adequate** fix, it closes the main vector (imported saves) for
surprise queues. Remaining gap: if the user continues without hitting import
again (from localStorage/IndexedDB), boot's `recoverStaleJobs` still
auto-runs pending queued jobs. The permanent fix for this + user-facing
cancel/visibility was moved to **T-034**. Sub-decision 3 (kanji auto-fill GET)
will also be reconsidered there.

Work:
1. **Cleanup on export** (`src/lib/save/export.ts`): after `serialize()`,
   open the buffer with a second better-sqlite3 connection (deserialize from
   the buffer; via a temp file if needed), `DELETE FROM
   generation_jobs WHERE status IN ('queued','running')`, re-serialize. Do
   NOT touch the live DB, an in-progress batch shouldn't die.
2. **Belt on import** (`src/lib/save/import.ts`): a single UPDATE marks any
   queued/running jobs in the incoming file as canceled. There are saves out
   in the wild taken before the cleanup fix; the export fix doesn't save
   them. Free insurance.
3. **Sub-decision (clarify during implementation)**: the auto-fill queue in
   the kanji list GET can also go to the LLM on its own with an imported save,
   on levels not covered by the seed. Pulling it to user-triggered like
   vocab/grammar would be consistent; but it's a deliberate feature, note the
   behavior change before removing it.

Verification: take an export mid-batch, open the file with sqlite3, confirm no
queued/running rows in generation_jobs; import an old (dirty) save, confirm
from the log that no job auto-runs on boot.
</content>
