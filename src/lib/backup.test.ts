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
import { pruneToK } from "./backup/rotate";

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

test("pruneToK orders by the `at` it's given, not by insertion order", () => {
  // The local snapshot store (src/db/browser.ts) feeds snapshot timestamps in
  // whatever order IndexedDB hands them back, so ordering must come from `at`
  // alone — the newest snapshot survives regardless of its position.
  const unordered = [
    { id: "old", at: 1000 },
    { id: "newest", at: 3000 },
    { id: "mid", at: 2000 },
  ];
  const doomed = pruneToK(unordered, 2);
  assert.deepEqual(doomed, ["old"], "only the truly-oldest is pruned");
  assert.ok(!doomed.includes("newest"), "the newest snapshot is never pruned");
});
