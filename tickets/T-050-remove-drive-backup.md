---
id: T-050
title: Remove Google Drive backup entirely (superseded by cloud-sync)
status: done
priority: p1
effort: M
confidence: high
depends: [T-047]
created: 2026-07-27
---
Burak decision (2026-07-27): the Google Drive OAuth backup leg of T-032
should be deleted entirely; okumo.dev cloud-sync (T-047) now covers this
need.

To be removed: the Drive OAuth/gapi flow, Drive upload/restore/rotation, the
Drive section + client-id field in Settings, BackupBar's Drive-restore
suggestion, related i18n copy.

TO KEEP (careful, shared infrastructure entangled with Drive):
- File export/import (save backup) and the backup nag bar.
- The `writeBackupState`/`markBackedUp` state machine; cloud push/pull uses it
  (T-047 fix 4).
- `isLocalEmpty`, `getLessonCount`, `emitBackupChange`; cloud.ts imports these
  from `controller.ts`, and once the controller is deleted these need to move
  to a suitable shared module (cloud.ts logic UNCHANGED, only the import
  path).
- BackupBar's "remote is newer" logic: once Drive is gone, the only remote is
  cloud, so the Drive branch should be removed and could hook into a cloud
  pull suggestion (keep it minimal).

No effect on the DB/save format (Drive tokens were memory-only, state was in
localStorage), DO NOT touch SAVE_SCHEMA_VERSION. Drive references in CLAUDE.md
need updating. The old `language-tutor-web` Drive client + Drive API grant in
Google Cloud Console is a separate ops step (the app no longer uses it;
deleting it is optional, out of this ticket's scope).

**T-050 implementation decisions (2026-07-27):**

- **The `controller.ts` name was KEPT, its contents emptied.** The ticket says
  "should move to a suitable shared module"; instead of moving, the Drive half
  was deleted from the file. Rationale: `isLocalEmpty`/`getLessonCount`/
  `emitBackupChange` were already there, and cloud.ts + client-api.ts +
  use-backup.ts + BackupBar didn't change their import path at all, meaning
  cloud.ts (fence: import path only) wasn't touched even one line. Moving them
  to `state.ts` would have been worse: that file's "PURE logic, no browser"
  boundary is what lets `backup.test.ts` run under node:test, and
  `isLocalEmpty` pulls in `@/db/browser`.
- **The ticket's TO KEEP list was incomplete.** It only counted the three
  functions cloud.ts imports; `controller.ts` also held
  `onLessonCompleted` (+`bumpLessonCount`), `maybeSnapshot`,
  `recordManualExport`, and `subscribeBackup`. `onLessonCompleted` is the ONLY
  place that increments the lesson counter; deleting it would have meant the
  nag bar the ticket explicitly says to KEEP would never fire again. The
  function was preserved, only the `void autoUpload()` call inside it was
  removed.
- **`queue.ts` + `sync-queue.ts` were also deleted** (not named in the
  ticket): the re-auth machine that queued uploads when the token expired
  belonged entirely to Drive; cloud.ts imports none of it (verified via grep),
  since cloud sync is manual push/pull. `BackupView.needsReauth` and
  BackupBar's "reconnect" option went along with it.
- **BackupBar's "remote is newer" offer was NOT connected to the cloud,
  it was removed.** The ticket says "could hook into a cloud pull suggestion
  (keep it minimal)"; not minimal: that would mean a `cloudInfo()` HEAD call
  for every signed-in user on every page open, and since the pull behind it is
  a destructive replace-all, it needs its own confirmation too. T-048 already
  placed the pull suggestion in the two right spots (return leg + Settings).
  BackupBar is now single-branch: a backup reminder.
- **`rotate.ts` is alive:** `pruneToK` is still used for the local IndexedDB
  snapshot rotation (`src/db/browser.ts`). Only `isRemoteNewer`, used by the
  Drive comparison, was deleted.
- **Deleted tests (for the record):** three `syncReducer` cases + one
  `isRemoteNewer` case went with their modules; the `pruneToK` case with
  Drive-modifiedTime was rewritten for the snapshot store it now serves.
  Total 106 -> 102 tests.
- **CLAUDE.md had NO Drive section** (grep matches were "drizzle driver" and
  "Drives the output language"). Since there was no reference to remove, a
  single "Cloud save-sync" bullet was added instead, since neither T-047 nor
  T-048 had documented it there either.
- **No npm dependency to remove:** Drive loaded GIS via a `<script>` tag
  (`accounts.google.com/gsi/client`), no trace in package.json. Lockfile
  untouched. Searching the `out/` build for `gsi/client`/`drive.appdata`/
  `googleusercontent` returns nothing.
- **Leftovers deliberately left out of fence:** `src/db/browser.ts` lines 69
  and 281 have two stale Drive comments (comment only, no behavior).
