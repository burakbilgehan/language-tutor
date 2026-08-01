---
id: T-032
title: Save incentive + Google Drive auto-backup
status: done
priority: p2
effort: L
confidence: medium
depends: [T-024]
created: 2026-07-22
---
No longer applies; the Drive backup built here was removed and replaced by
cloud save-sync. See [T-050](T-050-remove-drive-backup.md) and
[T-047](T-047-cloud-save-sync.md). Historical content preserved below.

Status (2026-07-22): both phases done. Phase 1 (header "Back up" chip +
reminder bar + IndexedDB last-K snapshot + storage.persist) and Phase 2
(SaveBackend seam + Drive appDataFolder sync, GIS token client + raw REST,
token-expiry queue, "newer save on open" prompt). All bookkeeping lives in
the localStorage/IDB side channel; it never touches the save image/DB
(SAVE_SCHEMA_VERSION untouched). Setup: docs/drive-backup-setup.md. Pure
logic covered by 15 unit tests (src/lib/backup.test.ts); npm test 73/73,
build + build:static + parity green. GIS/Drive I/O needs manual
in-browser verification (requires a real client ID): connect-back up-
delete-restore round trip, silent queueing + re-auth flow on an
expired-token tab, two-tab conflict.

Decision (2026-07-22, Burak): the client ID is NOT baked into the build;
the owner's personal Google project can't carry everyone's traffic on a
public product. The user enters their own ID (steps shown in the UI).
Consent was not moved to production (testing mode is enough for a single
user; production = the threshold package for opening up to the public).

Since we're serverless, the save file is the ONE persistence mechanism;
in static mode, if IndexedDB is cleared (browser cleanup, device change),
progress is gone. Game-style save mentality: as the user plays, progress
should be auto-backed-up to both a downloadable file AND the user's own
Drive (Burak, 2026-07-22).

Two phases, the first one cheap and immediately valuable:

**Phase 1; incentive + local safety net (S):**
- Surface the save export somewhere visible (header/a prominent "Save"
  flow instead of buried in Settings; adjacent to T-028).
- Reminder: a gentle "back up your progress" bar after N days since the
  last export / N completed lessons.
- Locally versioned safety net: last K auto-snapshots in IndexedDB
  (the image already exists; a periodic copy is cheap). Doesn't protect
  against browser cleanup, but rescues a corrupted-import/wrong-click
  scenario.
- Request `navigator.storage.persist()`; reduces the chance the browser
  silently clears IndexedDB.

**Phase 2; Google Drive sync (M):**
- Answer to "is this a lot of work?": no backend needed. OAuth from the
  browser via Google Identity Services (token client), `drive.appdata`
  scope -> the save image is written to the user's own Drive appDataFolder
  (in their own quota, invisible in the Drive UI; a visible-folder option
  if wanted). Compatible with a static site; only requires registering a
  Google Cloud OAuth client ID (origin-based, no secret).
- Flow: connect (single button) -> periodic + after-key-event (lesson
  completion) auto-upload; on open, if a newer save exists on Drive, a
  "load it?" prompt (conflict = timestamp comparison, last-write-wins +
  keep last K versions).
- Known friction points: GIS access token lasts ~1 hour (silent refresh
  usually works while the tab is open, one-click re-auth when needed);
  the verification process (scope isn't sensitive, appdata is usually
  easy to get approved); multi-device conflicts (last K versions + date
  display is enough).
- T-024 precondition: the image going to Drive also must not carry the
  job queue.

Note (Burak's forecast on item 1): if a real backend arrives later
(monetization/auth), save hosting is the natural first backend feature;
Phase 2's interface (upload/download/version list) should be abstracted
so it's portable to that day (`SaveBackend` seam: drive | self-hosted).

Verification: connect-back up-delete-restore round trip on a clean
profile; verify that on a tab with an expired token, auto-backup queues
silently and flows after re-auth; no data loss on a two-tab/device
conflict.
