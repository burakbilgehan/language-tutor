"use client";

// Google Drive backend for save sync (T-032 Faz 2). No backend server, no gapi
// client library: Google Identity Services (GIS) token client for OAuth in the
// browser + raw fetch against Drive v3 REST. Saves go to the user's OWN Drive
// appDataFolder (their quota, hidden from the Drive UI, scope drive.appdata —
// non-sensitive, easy consent).
//
// Security posture:
//  - Client ID is public config (localStorage). The token-client flow has NO
//    client secret by design.
//  - Access tokens live in MEMORY ONLY (never localStorage): XSS-safe-ish and
//    they die in ~1h anyway. GIS issues no refresh token to browsers; "silent
//    refresh" = requestAccessToken({prompt:''}) while the Google session lives.

import { BackendAuthError, type RemoteSave, type SaveBackend } from "./backend";
import { pruneToK } from "./rotate";

const GIS_SRC = "https://accounts.google.com/gsi/client";
const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
// Every save file we write carries this name prefix + its export epoch ms, so
// list() can recover the timestamp without an extra metadata read.
const FILE_PREFIX = "language-tutor-save-";
const KEEP_VERSIONS = 5;
const LS_CLIENT_ID = "drive-client-id";
// Remembers that the user granted consent at least once, so on a fresh page
// load we can attempt a SILENT (prompt:'') token acquisition instead of nagging
// them to click connect again. Not the token itself — that stays in memory.
const LS_DRIVE_LINKED = "drive-linked";

export function driveWasLinked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(LS_DRIVE_LINKED) === "1";
  } catch {
    return false;
  }
}
function setDriveLinked(linked: boolean): void {
  try {
    if (linked) localStorage.setItem(LS_DRIVE_LINKED, "1");
    else localStorage.removeItem(LS_DRIVE_LINKED);
  } catch {
    /* ignore */
  }
}

// ---- GIS types (minimal, we don't pull @types/google.accounts) --------------
interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}
interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
  callback: (resp: TokenResponse) => void;
}
interface GoogleOAuth2 {
  initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (resp: TokenResponse) => void;
    error_callback?: (err: { type?: string; message?: string }) => void;
  }): TokenClient;
  revoke(token: string, done?: () => void): void;
}
declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOAuth2 } };
  }
}

// ---- client-id config -------------------------------------------------------
export function readDriveClientId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LS_CLIENT_ID) || null;
  } catch {
    return null;
  }
}
export function writeDriveClientId(id: string): void {
  try {
    if (id.trim()) localStorage.setItem(LS_CLIENT_ID, id.trim());
    else localStorage.removeItem(LS_CLIENT_ID);
  } catch {
    /* ignore */
  }
}

// ---- GIS script loader (once) ----------------------------------------------
let gisLoaded: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (typeof window === "undefined")
    return Promise.reject(new Error("no window"));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoaded) return gisLoaded;
  gisLoaded = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      gisLoaded = null;
      reject(new Error("GIS script failed to load"));
    };
    document.head.appendChild(s);
  });
  return gisLoaded;
}

export class DriveBackend implements SaveBackend {
  readonly kind = "drive";
  private token: string | null = null;
  private tokenExpiry = 0; // epoch ms
  private client: TokenClient | null = null;
  readonly clientId: string;

  constructor(clientId: string) {
    this.clientId = clientId;
  }

  isConnected(): boolean {
    return this.token !== null && Date.now() < this.tokenExpiry - 30_000;
  }

  private async ensureClient(): Promise<TokenClient> {
    await loadGis();
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) throw new Error("GIS unavailable");
    if (!this.client) {
      this.client = oauth2.initTokenClient({
        client_id: this.clientId,
        scope: SCOPE,
        callback: () => {}, // replaced per-request below
      });
    }
    return this.client;
  }

  /**
   * Acquire a token. `silent` uses prompt:'' (no popup) for background refresh;
   * it rejects if Google can't issue one without interaction. Interactive mode
   * (default) shows the consent/account popup and must be user-gesture driven.
   */
  private async acquireToken(silent: boolean): Promise<void> {
    const client = await this.ensureClient();
    return new Promise<void>((resolve, reject) => {
      client.callback = (resp: TokenResponse) => {
        if (resp.error || !resp.access_token) {
          reject(new BackendAuthError(resp.error_description || resp.error));
          return;
        }
        this.token = resp.access_token;
        // expires_in is seconds; default to 55 min if absent.
        this.tokenExpiry = Date.now() + (resp.expires_in ?? 3300) * 1000;
        resolve();
      };
      try {
        client.requestAccessToken(silent ? { prompt: "" } : undefined);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  async connect(): Promise<void> {
    await this.acquireToken(false);
    setDriveLinked(true);
  }

  /**
   * Best-effort SILENT reconnect on startup (prompt:''). Succeeds only if the
   * user's Google session is alive and consent still stands; never shows a
   * popup. Returns true if a token was obtained. Safe to call when not linked
   * (short-circuits false).
   */
  async tryReconnect(): Promise<boolean> {
    if (!driveWasLinked()) return false;
    if (this.isConnected()) return true;
    try {
      await this.acquireToken(true);
      return this.token !== null;
    } catch {
      return false;
    }
  }

  disconnect(): void {
    const oauth2 = window.google?.accounts?.oauth2;
    if (this.token && oauth2) oauth2.revoke(this.token);
    this.token = null;
    this.tokenExpiry = 0;
    setDriveLinked(false);
  }

  /** Valid token or throw BackendAuthError. Tries a silent refresh first. */
  private async token$(): Promise<string> {
    if (this.isConnected() && this.token) return this.token;
    // Attempt silent refresh; on failure the caller queues + prompts re-auth.
    try {
      await this.acquireToken(true);
    } catch {
      throw new BackendAuthError();
    }
    if (!this.token) throw new BackendAuthError();
    return this.token;
  }

  private async authFetch(
    url: string,
    init: RequestInit,
    token: string
  ): Promise<Response> {
    const res = await fetch(url, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) {
      // Token died mid-flight — invalidate so the next call re-auths.
      this.token = null;
      this.tokenExpiry = 0;
      throw new BackendAuthError(`Drive ${res.status}`);
    }
    return res;
  }

  async list(): Promise<RemoteSave[]> {
    const token = await this.token$();
    const url =
      "https://www.googleapis.com/drive/v3/files" +
      "?spaces=appDataFolder" +
      "&fields=files(id,name,size,modifiedTime,appProperties)" +
      "&pageSize=100&orderBy=modifiedTime desc";
    const res = await this.authFetch(url, { method: "GET" }, token);
    if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
    const data = (await res.json()) as {
      files?: {
        id: string;
        name: string;
        size?: string;
        appProperties?: { exportedAt?: string };
      }[];
    };
    return (data.files ?? [])
      .filter((f) => f.name.startsWith(FILE_PREFIX))
      .map((f) => ({
        id: f.id,
        at:
          Number(f.appProperties?.exportedAt) ||
          timestampFromName(f.name) ||
          0,
        size: f.size ? Number(f.size) : undefined,
      }))
      .sort((a, b) => b.at - a.at);
  }

  async download(id: string): Promise<Uint8Array> {
    const token = await this.token$();
    const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
      id
    )}?alt=media`;
    const res = await this.authFetch(url, { method: "GET" }, token);
    if (!res.ok) throw new Error(`Drive download failed: ${res.status}`);
    return new Uint8Array(await res.arrayBuffer());
  }

  async upload(bytes: Uint8Array, at: number): Promise<void> {
    const token = await this.token$();
    const boundary = `ltbnd_${Math.random().toString(36).slice(2)}`;
    const metadata = {
      name: `${FILE_PREFIX}${at}.db`,
      parents: ["appDataFolder"],
      appProperties: { exportedAt: String(at) },
    };
    // Multipart/related body: JSON metadata part, then the binary media part.
    const enc = new TextEncoder();
    const head = enc.encode(
      `--${boundary}\r\n` +
        "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
        JSON.stringify(metadata) +
        `\r\n--${boundary}\r\n` +
        "Content-Type: application/octet-stream\r\n\r\n"
    );
    const tail = enc.encode(`\r\n--${boundary}--`);
    const body = new Blob([head, bytes as BlobPart, tail]);
    const res = await this.authFetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
      {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body,
      },
      token
    );
    if (!res.ok) throw new Error(`Drive upload failed: ${res.status}`);
    await this.prune();
  }

  /** Keep the newest KEEP_VERSIONS remote saves, delete the rest. */
  private async prune(): Promise<void> {
    try {
      const token = await this.token$();
      const saves = await this.list();
      const doomed = pruneToK(
        saves.map((s) => ({ id: s.id, at: s.at })),
        KEEP_VERSIONS
      );
      await Promise.all(
        doomed.map((id) =>
          this.authFetch(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
              id
            )}`,
            { method: "DELETE" },
            token
          ).catch(() => {})
        )
      );
    } catch {
      // Pruning is best-effort; a failure here must not fail the upload.
    }
  }
}

function timestampFromName(name: string): number {
  const m = name.match(/(\d{10,})/);
  return m ? Number(m[1]) : 0;
}
