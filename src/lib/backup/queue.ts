// Pending-upload queue (T-032 acceptance criterion: token-expiry queueing).
// When an auto-upload hits a dead token, we don't error — we mark that a backup
// is pending and flip a "needs re-auth" flag. After one-click re-auth the queue
// flushes. Because uploads are last-write-wins snapshots, the queue never needs
// more than ONE pending entry (the newest). This reducer keeps that invariant
// and stays pure so it unit-tests.

export interface SyncQueueState {
  /** A backup is waiting to be uploaded (token was dead). */
  pending: boolean;
  /** Export time of the pending backup, for the eventual upload metadata. */
  pendingAt: number | null;
  /** UI should surface a "reconnect Drive" affordance. */
  needsReauth: boolean;
}

export const EMPTY_SYNC_QUEUE: SyncQueueState = {
  pending: false,
  pendingAt: null,
  needsReauth: false,
};

export type SyncEvent =
  | { type: "queued"; at: number } // upload deferred due to dead token
  | { type: "uploaded" } // a flush succeeded
  | { type: "reauthed" } // user re-authenticated
  | { type: "reset" };

export function syncReducer(
  state: SyncQueueState,
  event: SyncEvent
): SyncQueueState {
  switch (event.type) {
    case "queued":
      // Coalesce: keep only the newest pending backup.
      return {
        pending: true,
        pendingAt: Math.max(event.at, state.pendingAt ?? 0),
        needsReauth: true,
      };
    case "uploaded":
      return { pending: false, pendingAt: null, needsReauth: false };
    case "reauthed":
      // Token restored; keep `pending` so the caller knows to flush, but the
      // re-auth banner can drop.
      return { ...state, needsReauth: false };
    case "reset":
      return { ...EMPTY_SYNC_QUEUE };
  }
}
