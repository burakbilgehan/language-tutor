"use client";

// Backup controller — the client-side glue between completion events, local
// snapshots and backup bookkeeping. Kept out of the React tree so client-api
// can call it from completeNodeApi without a hook.
//
// STATIC MODE ONLY: server mode's save lives on disk with its own .bak, so
// there is no browser image to snapshot and no reminder to raise.
//
// T-050: the Google Drive sync leg that used to live here was removed —
// cloud save-sync (src/lib/backup/cloud.ts, manual push/pull against our own
// Worker) replaced it. What remains is the part Drive never owned: the
// completed-lesson counter, the throttled local snapshot, the nag-bar
// bookkeeping, and the change-notification seam. `isLocalEmpty`,
// `getLessonCount` and `emitBackupChange` are imported by cloud.ts and keep
// living here on purpose (the module name is unchanged so no consumer moved).

import {
  readBackupState,
  writeBackupState,
  markBackedUp,
} from "./state";

const LS_LESSON_COUNT = "backup-lesson-count";
// Don't snapshot on every completion — cap the churn (IndexedDB writes).
const SNAPSHOT_MIN_INTERVAL_MS = 5 * 60 * 1000;
const LS_LAST_SNAPSHOT_AT = "backup-last-snapshot-at";

/** Completed-lesson counter (localStorage, per browser). Reminder input. */
export function getLessonCount(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(LS_LESSON_COUNT)) || 0;
}
function bumpLessonCount(): number {
  const next = getLessonCount() + 1;
  try {
    localStorage.setItem(LS_LESSON_COUNT, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

// Listeners so UI (reminder bar, settings) re-reads state after an event.
type Listener = () => void;
const listeners = new Set<Listener>();
export function subscribeBackup(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function emit() {
  for (const l of listeners) l();
}

/**
 * Called after a lesson completes (from client-api's completeNodeApi).
 * Bumps the counter and takes a throttled local snapshot. Never throws;
 * backup is best-effort and must not break the completion flow.
 */
export async function onLessonCompleted(): Promise<void> {
  bumpLessonCount();
  emit();
  await maybeSnapshot();
}

async function maybeSnapshot(): Promise<void> {
  try {
    const last = Number(localStorage.getItem(LS_LAST_SNAPSHOT_AT)) || 0;
    if (Date.now() - last < SNAPSHOT_MIN_INTERVAL_MS) return;
    const { getBrowserDb } = await import("@/db/browser");
    const handle = await getBrowserDb();
    await handle.takeSnapshot();
    localStorage.setItem(LS_LAST_SNAPSHOT_AT, String(Date.now()));
    emit();
  } catch (err) {
    console.warn("[backup] snapshot failed:", err);
  }
}

/** Does the local browser DB have no profile yet (empty / freshly evicted)?
 * Exported for the cloud controller (./cloud.ts), which needs this guard: its
 * destination is a single R2 key with no version history, so overwriting it
 * with an empty image is unrecoverable. */
export async function isLocalEmpty(): Promise<boolean> {
  try {
    const { getBrowserDb } = await import("@/db/browser");
    const { getActiveProfile } = await import("@/core/profile");
    const handle = await getBrowserDb();
    return !getActiveProfile(handle.db);
  } catch {
    return false; // if unsure, don't claim empty (avoids clobbering real data)
  }
}

/** Record a manual local export (download) so the reminder resets. */
export function recordManualExport(): void {
  const s = readBackupState();
  writeBackupState(markBackedUp(s, getLessonCount(), Date.now()));
  emit();
}

export { emit as emitBackupChange };
