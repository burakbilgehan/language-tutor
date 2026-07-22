// SaveBackend seam (T-032). Today the only implementation is Google Drive
// (browser-only, static mode). The point of the seam is the note in the ticket:
// if a real backend arrives later (auth/monetization), save hosting is the
// natural first server feature and this same interface — upload / download /
// version list — carries over to a self-hosted backend with no UI churn.

/** One backed-up save on the remote, newest identified by `at`. */
export interface RemoteSave {
  /** Backend-specific id (Drive file id, or a server row id later). */
  id: string;
  /** Epoch ms this save represents (its export time). Newest wins. */
  at: number;
  /** Byte size, if the backend reports it. */
  size?: number;
}

export interface SaveBackend {
  /** Stable key for UI copy / persisted "which backend" (e.g. "drive"). */
  readonly kind: string;
  /** Is a usable session established (token present / not expired)? */
  isConnected(): boolean;
  /**
   * Establish a session. Interactive (may open a consent popup). Resolves once
   * a token is in hand; rejects if the user cancels or config is missing.
   */
  connect(): Promise<void>;
  /** Drop the local session (does not delete remote data). */
  disconnect(): void;
  /**
   * Upload a save image. Keeps the last K remote versions (prunes oldest).
   * `at` is the save's export time, stored as remote metadata for compare.
   * Throws BackendAuthError when the token is dead so the caller can queue +
   * prompt re-auth.
   */
  upload(bytes: Uint8Array, at: number): Promise<void>;
  /** List remote saves, newest first. */
  list(): Promise<RemoteSave[]>;
  /** Download a specific remote save's bytes. */
  download(id: string): Promise<Uint8Array>;
}

/**
 * Thrown by a backend when the operation failed because the session/token is
 * no longer valid. The caller queues the pending upload and flips a "needs
 * re-auth" UI state instead of surfacing an error.
 */
export class BackendAuthError extends Error {
  constructor(message = "backend auth expired") {
    super(message);
    this.name = "BackendAuthError";
  }
}
