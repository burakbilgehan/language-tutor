"use client";

// Backup controller — the client-side glue between completion events, local
// snapshots, backup bookkeeping, and (static mode) Drive sync. Kept out of the
// React tree so client-api can call it from completeNodeApi without a hook.
//
// Mode split:
//  - Local snapshots + reminder bookkeeping: static mode only (server mode's
//    save lives on disk with its own .bak; there is no browser image to copy).
//  - Drive sync: static mode only (GIS is browser-only). The SaveBackend seam
//    keeps a future self-hosted/server backend possible without UI churn.

import { IS_STATIC } from "@/lib/client-api";
import {
  readBackupState,
  writeBackupState,
  markBackedUp,
} from "./state";
import { readDriveClientId, DriveBackend } from "./drive";
import type { SaveBackend } from "./backend";

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

// ---- singleton Drive backend ------------------------------------------------
let backend: SaveBackend | null = null;
export function getDriveBackend(): SaveBackend | null {
  if (!IS_STATIC) return null;
  const clientId = readDriveClientId();
  if (!clientId) {
    backend = null;
    return null;
  }
  // Rebuild if the client id changed (constructor captured the old one).
  if (!backend || (backend as DriveBackend).clientId !== clientId) {
    backend = new DriveBackend(clientId);
  }
  return backend;
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
 * Called after a lesson completes (from client-api's completeNodeApi, static
 * mode). Bumps the counter, takes a throttled local snapshot, and — if Drive is
 * connected — kicks a background auto-upload. Never throws; backup is
 * best-effort and must not break the completion flow.
 */
export async function onLessonCompleted(): Promise<void> {
  if (!IS_STATIC) return;
  bumpLessonCount();
  emit();
  await maybeSnapshot();
  void autoUpload().catch(() => {});
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

/**
 * Upload the current save image to Drive if a session is live. On a dead token
 * this queues (via the sync queue) and flips needsReauth — it does NOT prompt,
 * because an interactive popup needs a user gesture. Returns true on a real
 * upload. Callers ignore the result; the UI reads queue state via useBackup.
 */
export async function autoUpload(): Promise<boolean> {
  const be = getDriveBackend();
  if (!be) return false;
  // BLOCKER guard: never upload an empty DB. After IndexedDB eviction the
  // startup flow can recreate a fresh empty image; if list()/isConnected()
  // momentarily fail the restore offer is skipped, and an unguarded upload
  // would push that empty image as the newest save — winning restore
  // comparisons and pruning the real save. An empty (no active profile) DB is
  // never legitimate save material, so refuse here where ALL callers inherit it.
  if (await isLocalEmpty()) return false;
  const { getBrowserDb } = await import("@/db/browser");
  const { markSyncQueued, markSyncUploaded } = await import("./sync-queue");
  const handle = await getBrowserDb();
  await handle.persistNow();
  const bytes = handle.exportBytes();
  const at = Date.now();
  try {
    // upload() returns the SERVER modifiedTime — record THAT as lastSyncedAt so
    // the next startup compare is on the same clock as list() (no false "newer
    // remote" from local/server skew).
    const syncedAt = await be.upload(bytes, at);
    const s = readBackupState();
    writeBackupState(
      markBackedUp(s, getLessonCount(), syncedAt, { synced: true })
    );
    markSyncUploaded();
    emit();
    return true;
  } catch (err) {
    const { BackendAuthError } = await import("./backend");
    if (err instanceof BackendAuthError) {
      markSyncQueued(at);
      emit();
      return false;
    }
    console.warn("[backup] auto-upload failed:", err);
    return false;
  }
}

/** A Drive save worth offering to restore (id + its export time). */
export interface RestoreCandidate {
  id: string;
  at: number;
}

/** Does the local browser DB have no profile yet (empty / freshly evicted)? */
async function isLocalEmpty(): Promise<boolean> {
  try {
    const { getBrowserDb } = await import("@/db/browser");
    const { getActiveProfile } = await import("@/core/profile");
    const handle = await getBrowserDb();
    return !getActiveProfile(handle.db);
  } catch {
    return false; // if unsure, don't claim empty (avoids clobbering real data)
  }
}

/**
 * Should we offer to restore a Drive save? Recovery direction is NOT just
 * "remote strictly newer than lastSyncedAt" — the disaster case (IndexedDB
 * evicted, localStorage survives) leaves lastSyncedAt == remote's timestamp,
 * which "strictly newer" would miss. So we ALSO offer whenever the local DB is
 * empty and Drive has any save. Returns the newest remote save to offer, or null.
 */
export async function findRestoreCandidate(): Promise<RestoreCandidate | null> {
  const be = getDriveBackend();
  if (!be || !be.isConnected()) return null;
  let saves;
  try {
    saves = await be.list();
  } catch {
    return null;
  }
  const newest = saves[0];
  if (!newest) return null;
  const { isRemoteNewer } = await import("./rotate");
  const state = readBackupState();
  const localEmpty = await isLocalEmpty();
  if (localEmpty || isRemoteNewer(state.lastSyncedAt, newest.at)) {
    return { id: newest.id, at: newest.at };
  }
  return null;
}

/**
 * Interactive connect. Called from the "Connect Drive" button (user gesture, so
 * the consent popup is allowed). Returns a restore candidate if Drive already
 * holds a save that should be offered BEFORE we upload local state — otherwise
 * uploads the current save and returns null. This ordering is what prevents a
 * freshly-onboarded local profile from shadowing a real save on first connect.
 */
export async function connectDrive(): Promise<RestoreCandidate | null> {
  const be = getDriveBackend();
  if (!be) throw new Error("no-client-id");
  await be.connect();
  const { markSyncReauthed } = await import("./sync-queue");
  markSyncReauthed();
  emit();
  const candidate = await findRestoreCandidate();
  if (candidate) return candidate; // let the caller offer restore first
  await autoUpload();
  return null;
}

/**
 * Download a Drive save and make it the live image (restore). Snapshots current
 * state first as a safety net, records the sync point so we don't re-prompt.
 */
export async function restoreFromDrive(cand: RestoreCandidate): Promise<void> {
  const be = getDriveBackend();
  if (!be) throw new Error("no-client-id");
  const bytes = await be.download(cand.id);
  const { getBrowserDb } = await import("@/db/browser");
  const handle = await getBrowserDb();
  await handle.takeSnapshot(); // safety net before replacing
  await handle.importBytes(bytes);
  writeBackupState(
    markBackedUp(readBackupState(), getLessonCount(), cand.at, { synced: true })
  );
  emit();
}

/** After re-auth (token restored), flush any pending upload. */
export async function flushPending(): Promise<void> {
  const be = getDriveBackend();
  if (!be) return;
  if (!be.isConnected()) {
    await be.connect(); // user-gesture path
  }
  const { markSyncReauthed } = await import("./sync-queue");
  markSyncReauthed();
  emit();
  await autoUpload();
}

/** Record a manual local export (download) so the reminder resets. */
export function recordManualExport(): void {
  const s = readBackupState();
  writeBackupState(markBackedUp(s, getLessonCount(), Date.now()));
  emit();
}

export { emit as emitBackupChange };
