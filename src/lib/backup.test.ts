import { test } from "node:test";
import assert from "node:assert/strict";
import {
  shouldRemind,
  markBackedUp,
  markDismissed,
  EMPTY_BACKUP_STATE,
  REMIND_AFTER_DAYS,
  REMIND_AFTER_LESSONS,
  REMIND_SNOOZE_DAYS,
  type BackupState,
} from "./backup/state";
import { pruneToK, isRemoteNewer } from "./backup/rotate";
import { syncReducer, EMPTY_SYNC_QUEUE } from "./backup/queue";

const DAY = 24 * 60 * 60 * 1000;
const T0 = 1_700_000_000_000;

// ---------------------------------------------------------------- shouldRemind

test("no reminder with zero lessons", () => {
  assert.equal(
    shouldRemind({ state: EMPTY_BACKUP_STATE, lessonCount: 0, now: T0 }),
    false
  );
});

test("no reminder for a single lesson on a fresh profile", () => {
  assert.equal(
    shouldRemind({ state: EMPTY_BACKUP_STATE, lessonCount: 1, now: T0 }),
    false
  );
});

test("reminder once enough lessons pile up, never backed up", () => {
  assert.equal(
    shouldRemind({
      state: EMPTY_BACKUP_STATE,
      lessonCount: REMIND_AFTER_LESSONS,
      now: T0,
    }),
    true
  );
});

test("reminder after N days since last backup with new lessons", () => {
  const state: BackupState = {
    ...EMPTY_BACKUP_STATE,
    lastBackupAt: T0,
    lastBackupLessonCount: 3,
  };
  // 1 new lesson, but only after the day threshold.
  assert.equal(
    shouldRemind({ state, lessonCount: 4, now: T0 + DAY }),
    false,
    "too soon"
  );
  assert.equal(
    shouldRemind({
      state,
      lessonCount: 4,
      now: T0 + (REMIND_AFTER_DAYS + 1) * DAY,
    }),
    true,
    "past day threshold"
  );
});

test("no reminder when nothing new since last backup even after days", () => {
  const state: BackupState = {
    ...EMPTY_BACKUP_STATE,
    lastBackupAt: T0,
    lastBackupLessonCount: 10,
  };
  assert.equal(
    shouldRemind({ state, lessonCount: 10, now: T0 + 10 * DAY }),
    false
  );
});

test("dismissal snoozes the reminder, then it returns", () => {
  let state: BackupState = {
    ...EMPTY_BACKUP_STATE,
    lastBackupLessonCount: 0,
  };
  // Enough lessons to normally remind.
  assert.equal(
    shouldRemind({ state, lessonCount: REMIND_AFTER_LESSONS, now: T0 }),
    true
  );
  state = markDismissed(state, T0);
  assert.equal(
    shouldRemind({ state, lessonCount: REMIND_AFTER_LESSONS, now: T0 + DAY }),
    false,
    "snoozed"
  );
  assert.equal(
    shouldRemind({
      state,
      lessonCount: REMIND_AFTER_LESSONS,
      now: T0 + (REMIND_SNOOZE_DAYS + 1) * DAY,
    }),
    true,
    "snooze expired"
  );
});

test("markBackedUp clears the nudge and stamps the count", () => {
  const dismissed = markDismissed(EMPTY_BACKUP_STATE, T0);
  const backed = markBackedUp(dismissed, 7, T0 + DAY, { synced: true });
  assert.equal(backed.lastBackupLessonCount, 7);
  assert.equal(backed.lastBackupAt, T0 + DAY);
  assert.equal(backed.lastSyncedAt, T0 + DAY);
  assert.equal(backed.reminderDismissedAt, null);
  assert.equal(
    shouldRemind({ state: backed, lessonCount: 7, now: T0 + 2 * DAY }),
    false,
    "just-backed-up profile is quiet"
  );
});

test("markBackedUp without synced leaves lastSyncedAt untouched", () => {
  const withSync: BackupState = { ...EMPTY_BACKUP_STATE, lastSyncedAt: 999 };
  const backed = markBackedUp(withSync, 3, T0);
  assert.equal(backed.lastSyncedAt, 999, "local download doesn't touch sync ts");
});

// ---------------------------------------------------------------- rotate

test("pruneToK keeps the newest K, returns the rest to delete", () => {
  const items = [
    { id: "a", at: 10 },
    { id: "b", at: 30 },
    { id: "c", at: 20 },
    { id: "d", at: 40 },
  ];
  const doomed = pruneToK(items, 2);
  assert.deepEqual(doomed.sort(), ["a", "c"], "oldest two pruned");
});

test("pruneToK under K deletes nothing", () => {
  assert.deepEqual(pruneToK([{ id: "a", at: 1 }], 5), []);
});

test("pruneToK with K=0 deletes everything", () => {
  assert.deepEqual(
    pruneToK([{ id: "a", at: 1 }, { id: "b", at: 2 }], 0).sort(),
    ["a", "b"]
  );
});

test("pruneToK keeps the newest by the `at` it's given — the newest real upload survives when `at` is Drive modifiedTime, not a skewed uploader clock", () => {
  // Scenario: a lagging device uploaded most recently. If ordering used the
  // uploader's wall clock, `lagging` (small stamp) would sort oldest and be
  // pruned. list() now feeds Drive-authoritative modifiedTime as `at`, so the
  // genuinely-newest upload has the largest `at` and is kept.
  const byModifiedTime = [
    { id: "old", at: 1000 },
    { id: "mid", at: 2000 },
    { id: "lagging-but-newest", at: 3000 }, // Drive modifiedTime, not skewed
  ];
  const doomed = pruneToK(byModifiedTime, 2);
  assert.deepEqual(doomed, ["old"], "only the truly-oldest is pruned");
  assert.ok(
    !doomed.includes("lagging-but-newest"),
    "the newest real upload is never pruned"
  );
});

test("isRemoteNewer semantics", () => {
  assert.equal(isRemoteNewer(null, 100), true, "never synced, remote exists");
  assert.equal(isRemoteNewer(100, null), false, "remote empty");
  assert.equal(isRemoteNewer(100, 200), true, "remote strictly newer");
  assert.equal(isRemoteNewer(200, 100), false, "local ahead");
  assert.equal(isRemoteNewer(100, 100), false, "equal is not newer");
});

// ---------------------------------------------------------------- sync queue

test("queued coalesces to the newest pending, flags reauth", () => {
  let s = syncReducer(EMPTY_SYNC_QUEUE, { type: "queued", at: 100 });
  assert.equal(s.pending, true);
  assert.equal(s.needsReauth, true);
  assert.equal(s.pendingAt, 100);
  s = syncReducer(s, { type: "queued", at: 50 });
  assert.equal(s.pendingAt, 100, "older queued does not overwrite newer");
  s = syncReducer(s, { type: "queued", at: 250 });
  assert.equal(s.pendingAt, 250, "newer wins");
});

test("reauthed drops the banner but keeps pending for a flush", () => {
  let s = syncReducer(EMPTY_SYNC_QUEUE, { type: "queued", at: 100 });
  s = syncReducer(s, { type: "reauthed" });
  assert.equal(s.needsReauth, false);
  assert.equal(s.pending, true);
  assert.equal(s.pendingAt, 100);
});

test("uploaded clears the queue", () => {
  let s = syncReducer(EMPTY_SYNC_QUEUE, { type: "queued", at: 100 });
  s = syncReducer(s, { type: "uploaded" });
  assert.deepEqual(s, EMPTY_SYNC_QUEUE);
});
