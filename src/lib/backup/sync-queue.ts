"use client";

// Stateful localStorage wrapper around the pure syncReducer. Persists the
// pending-upload state across reloads (a queued backup should survive a page
// refresh until the user re-auths and it flushes).

import {
  syncReducer,
  EMPTY_SYNC_QUEUE,
  type SyncQueueState,
  type SyncEvent,
} from "./queue";

const LS_KEY = "backup-sync-queue";

export function readSyncQueue(): SyncQueueState {
  if (typeof window === "undefined") return { ...EMPTY_SYNC_QUEUE };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...EMPTY_SYNC_QUEUE };
    return { ...EMPTY_SYNC_QUEUE, ...(JSON.parse(raw) as Partial<SyncQueueState>) };
  } catch {
    return { ...EMPTY_SYNC_QUEUE };
  }
}

function dispatch(event: SyncEvent): SyncQueueState {
  const next = syncReducer(readSyncQueue(), event);
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export const markSyncQueued = (at: number) => dispatch({ type: "queued", at });
export const markSyncUploaded = () => dispatch({ type: "uploaded" });
export const markSyncReauthed = () => dispatch({ type: "reauthed" });
export const resetSyncQueue = () => dispatch({ type: "reset" });
