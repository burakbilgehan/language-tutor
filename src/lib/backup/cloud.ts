"use client";

// Cloud save-sync controller (T-047) — the R2/Worker twin of ./controller.ts
// (Drive). Same architecture, different destination: a manual push/pull pair
// against our own authenticated Worker instead of the user's Drive.
//
// Manual only, deliberately (the ticket's call): a multi-MB blob on every write
// would burn R2 Class A operations and the user's uplink. So there is no
// auto-upload here — that is Drive's job for the anonymous local-first flow.
//
// What is NOT here: any UI, and any auth-state hook. T-048 owns the onboarding
// and settings surfaces plus the shared session hook; this module only exports
// functions for it to wire, and checks the session inline so it can fail with a
// clear "not signed in" instead of a bare 401.
//
// ---------------------------------------------------------------------------
// SEED-STRIP
//
// Push does NOT send the raw save. It sends a seed-stripped copy: content that
// the CDN already serves (public/{grammar,kanji,vocab}-seed) is removed, and
// pull re-applies it from there. Measured on the owner's real database, the
// snapshot goes 17.5 MB → 8.6 MB. The strip runs on a DETACHED COPY — never the
// live DB, which would destroy the user's library.

import { IS_STATIC } from "@/lib/client-api";
import { AppError } from "@/lib/errors";
import { SAVE_SCHEMA_VERSION } from "@/lib/save/version";
import {
  stripSeedContentWithManifest,
  readStripManifest,
  findUnreconstituted,
  sqlJsStripExec,
  type SeedBundle,
  type StripStats,
  type UnreconstitutedRow,
} from "@/lib/save/seed-strip";

/**
 * Base URL of the Worker API.
 *
 * Default "" = same-origin relative `/api/*`, which is the shipped topology:
 * T-046 serves the site and the API from ONE origin precisely so the session
 * cookie is first-party. Nothing to configure in production.
 *
 * The override exists for the two environments where that is not true:
 *   - `npm run dev` on :3000 talking to `wrangler dev` on :8787
 *   - the GitHub Pages mirror, a different origin entirely
 * Same shape as readDriveClientId() — a localStorage key a settings field can
 * write. Left unset on Pages, `/api/save` simply 404s and the controller
 * reports cloud sync as unavailable, which is the correct state there (that
 * mirror is anonymous-only by design).
 */
const LS_API_BASE = "cloud-api-base";

export function readCloudApiBase(): string {
  if (typeof window === "undefined") return "";
  try {
    return (localStorage.getItem(LS_API_BASE) || "").replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function writeCloudApiBase(base: string | null): void {
  try {
    if (base) localStorage.setItem(LS_API_BASE, base.replace(/\/$/, ""));
    else localStorage.removeItem(LS_API_BASE);
  } catch {
    /* ignore */
  }
}

function apiUrl(path: string): string {
  return `${readCloudApiBase()}${path}`;
}

/** Header carrying the save-format version. Spelled again in
 * worker/src/routes.ts (the server half) — the Worker is a separate package
 * with its own lockfile and no path into this src/, so the two ends cannot
 * share a constant. Change one, change the other. */
const VERSION_HEADER = "x-lt-schema-version";

/** Thrown when the user is not signed in. T-048 turns this into a sign-in
 * prompt; it is deliberately distinct from a transport failure. */
export class NotSignedInError extends Error {
  constructor() {
    super("not signed in");
    this.name = "NotSignedInError";
  }
}

/**
 * Thrown when a push is refused because the LOCAL database is empty.
 *
 * The disaster case this exists for: IndexedDB gets evicted, the app recreates
 * a fresh empty image on next load, and the user — seeing an empty app —
 * clicks "buluta gönder". That would overwrite their only cloud copy with
 * nothing. Worse than the Drive equivalent, which keeps K versions; here there
 * is a single key and no history, so the good save is simply gone.
 *
 * Distinct from every other error on purpose: T-048 should render this as
 * "local looks empty — pull instead?", never as a generic failure.
 */
export class LocalEmptyError extends Error {
  constructor() {
    super("local database is empty");
    this.name = "LocalEmptyError";
  }
}

export interface CloudSaveInfo {
  updatedAt: string | null;
  schemaVersion: string | null;
  exists: boolean;
}

/**
 * Is there a live session? Inline `get-session` check rather than a hook — the
 * shared auth-status hook is T-048's. `credentials: "include"` is mandatory on
 * every call here: the session is an HttpOnly cookie, and cross-origin dev
 * would otherwise send nothing.
 */
export async function isSignedIn(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl("/api/auth/get-session"), {
      credentials: "include",
      headers: { accept: "application/json" },
    });
    if (!res.ok) return false;
    const body = await res.json().catch(() => null);
    return !!(body && typeof body === "object" && "user" in body && body.user);
  } catch {
    return false;
  }
}

async function requireSession(): Promise<void> {
  if (!(await isSignedIn())) throw new NotSignedInError();
}

/** Fetch the three packaged seeds for every language present in this save.
 * A failed fetch yields null for that language, which the strip treats as
 * "nothing strippable" — offline degrades to a bigger upload, never to loss. */
async function loadSeeds(languages: string[]): Promise<SeedBundle> {
  const [{ fetchGrammarSeed }, { fetchKanjiSeed }, { fetchVocabSeed }] =
    await Promise.all([
      import("@/lib/grammar-seed"),
      import("@/lib/kanji-seed"),
      import("@/lib/vocab-seed"),
    ]);
  const bundle: SeedBundle = { grammar: {}, kanji: {}, vocab: {} };
  await Promise.all(
    languages.map(async (lang) => {
      const [g, k, v] = await Promise.all([
        fetchGrammarSeed(lang).catch(() => null),
        fetchKanjiSeed(lang).catch(() => null),
        fetchVocabSeed(lang).catch(() => null),
      ]);
      bundle.grammar![lang] = g;
      bundle.kanji![lang] = k;
      bundle.vocab![lang] = v;
    })
  );
  return bundle;
}

export interface PushResult {
  bytes: number;
  originalBytes: number;
  stripped: StripStats;
  updatedAt: string;
}

/**
 * Build the blob to upload: take the current save image, strip seed content
 * from a COPY, VACUUM, serialize.
 *
 * VACUUM is not optional. SQLite keeps freed pages, so without it the deletes
 * reclaim nothing and the file stays its original size — the entire point of
 * the strip is lost. Measured: 17.5 MB stays 17.5 MB without VACUUM, becomes
 * 8.6 MB with it.
 */
async function buildStrippedBlob(): Promise<{
  bytes: Uint8Array;
  originalBytes: number;
  stripped: StripStats;
}> {
  const { getBrowserDb } = await import("@/db/browser");
  const handle = await getBrowserDb();
  await handle.persistNow();
  const original = handle.exportBytes();

  // DETACHED copy. Stripping the live handle would delete the user's real
  // cached content, not just the copy destined for the cloud. sql.js is
  // initialized the same way src/db/browser.ts does it (wasm served from the
  // site root, hence withBase).
  const [{ default: initSqlJs }, { withBase }] = await Promise.all([
    import("sql.js"),
    import("@/lib/base-path"),
  ]);
  const SQL = await initSqlJs({ locateFile: (file: string) => withBase(`/${file}`) });
  const copy = new SQL.Database(original);
  try {
    const exec = sqlJsStripExec(copy);
    // Which languages does this save contain? Drives which seeds to fetch.
    const languages = exec
      .all(`SELECT DISTINCT target_language AS lang FROM profiles`)
      .map((r) => r.lang as string);
    const seeds = await loadSeeds(languages);

    // Records a manifest of what was removed into the COPY's save_meta, so the
    // restoring side can detect seed drift instead of silently losing content.
    const { stats: stripped } = stripSeedContentWithManifest(exec, seeds);
    copy.run("VACUUM");
    return { bytes: copy.export(), originalBytes: original.byteLength, stripped };
  } finally {
    copy.close();
  }
}

/**
 * Push the local save to the cloud ("buluta gönder"). Manual, user-triggered.
 * Last-write-wins: this overwrites whatever is stored.
 */
export async function pushToCloud(): Promise<PushResult> {
  if (!IS_STATIC) throw new Error("cloud sync is static-mode only");
  await requireSession();

  // BLOCKER guard, same one autoUpload() applies for Drive — and it matters
  // MORE here. After IndexedDB eviction the startup flow can recreate a fresh
  // empty image; pushing that would overwrite the single R2 key, which (unlike
  // Drive's K versions) has no history to recover from. An empty DB is never
  // legitimate save material.
  const { isLocalEmpty } = await import("./controller");
  if (await isLocalEmpty()) throw new LocalEmptyError();

  const { bytes, originalBytes, stripped } = await buildStrippedBlob();

  const res = await fetch(apiUrl("/api/save"), {
    method: "PUT",
    credentials: "include",
    headers: {
      "content-type": "application/octet-stream",
      [VERSION_HEADER]: String(SAVE_SCHEMA_VERSION),
    },
    // Uint8Array (not a stream): the Worker requires a known Content-Length,
    // and fetch sets it automatically for a buffer body.
    body: bytes as BodyInit,
  });

  if (res.status === 401) throw new NotSignedInError();
  // 413 is genuinely "this save is too big to sync". Everything else — R2
  // unavailable, connection dropped (the Worker answers 503 upload_failed) —
  // must NOT be reported as an invalid save: the save is fine, the service
  // blipped, and telling the user otherwise would be actively misleading.
  if (res.status === 413) throw new AppError("save_invalid");
  if (!res.ok) throw new AppError("save_load_failed");

  const body = (await res.json()) as { updatedAt?: string };
  const updatedAt = body.updatedAt ?? new Date().toISOString();

  // A successful push IS a backup — record it, or the reminder bar keeps
  // nagging and findRestoreCandidate() keeps offering a stale Drive restore
  // over data we just synced. Mirrors restoreFromDrive's bookkeeping.
  const { readBackupState, writeBackupState, markBackedUp } = await import("./state");
  const { getLessonCount, emitBackupChange } = await import("./controller");
  writeBackupState(
    markBackedUp(readBackupState(), getLessonCount(), Date.parse(updatedAt) || Date.now(), {
      synced: true,
    })
  );
  emitBackupChange();

  return { bytes: bytes.byteLength, originalBytes, stripped, updatedAt };
}

/** What is stored in the cloud, without downloading it (R2 head()). */
export async function getCloudInfo(): Promise<CloudSaveInfo> {
  await requireSession();
  const res = await fetch(apiUrl("/api/save"), {
    method: "HEAD",
    credentials: "include",
  });
  if (res.status === 404) return { exists: false, updatedAt: null, schemaVersion: null };
  if (res.status === 401) throw new NotSignedInError();
  return {
    exists: res.ok,
    updatedAt: res.headers.get("x-lt-updated-at"),
    schemaVersion: res.headers.get(VERSION_HEADER),
  };
}

/**
 * Pull the cloud save and make it live ("buluttan getir"). REPLACE-ALL, exactly
 * like every other restore path: the existing image is snapshotted first (the
 * browser's .bak equivalent) and then replaced.
 *
 * Ordering matters. The blob is validated (header + schema version + hostile
 * object check, via importBytes → validateSaveImage) BEFORE it replaces
 * anything, and the Worker has already refused a version-mismatched blob
 * server-side, so a save that cannot be loaded never reaches the live DB.
 */
/** Open a detached sql.js instance over `bytes` and run `fn` against it. */
async function withDetached<T>(
  bytes: Uint8Array,
  fn: (db: import("sql.js").Database) => T
): Promise<T> {
  const [{ default: initSqlJs }, { withBase }] = await Promise.all([
    import("sql.js"),
    import("@/lib/base-path"),
  ]);
  const SQL = await initSqlJs({ locateFile: (file: string) => withBase(`/${file}`) });
  const db = new SQL.Database(bytes);
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

/**
 * Compare the restored image against the strip manifest it carries. Returns the
 * rows the manifest says were stripped but which are still not `ready` — i.e.
 * content the packaged seed could no longer reconstitute.
 */
async function checkSeedDrift(bytes: Uint8Array): Promise<UnreconstitutedRow[]> {
  return withDetached(bytes, (db) => {
    const exec = sqlJsStripExec(db);
    const manifest = readStripManifest(exec);
    return manifest ? findUnreconstituted(exec, manifest) : [];
  });
}

export interface PullResult {
  reseeded: number;
  /** Rows the blob's manifest says were stripped but that the seed did NOT
   * bring back — real content loss from seed drift (a renamed/removed slug).
   * Empty on a clean restore. No UI here; T-048 renders it. */
  warnings: UnreconstitutedRow[];
}

export async function pullFromCloud(): Promise<PullResult> {
  if (!IS_STATIC) throw new Error("cloud sync is static-mode only");
  await requireSession();

  const res = await fetch(apiUrl("/api/save"), {
    credentials: "include",
    // Tell the Worker which format we can read; it 409s rather than handing
    // back bytes we would fail to import.
    headers: { [VERSION_HEADER]: String(SAVE_SCHEMA_VERSION) },
  });

  if (res.status === 401) throw new NotSignedInError();
  if (res.status === 404) throw new AppError("save_load_failed");
  if (res.status === 409) {
    const body = (await res.json().catch(() => ({}))) as { stored?: string };
    throw new AppError("save_version_mismatch", {
      file: body.stored ?? "?",
      app: SAVE_SCHEMA_VERSION,
    });
  }
  if (!res.ok) throw new AppError("save_load_failed");

  const bytes = new Uint8Array(await res.arrayBuffer());

  const { getBrowserDb } = await import("@/db/browser");
  const handle = await getBrowserDb();
  await handle.takeSnapshot(); // safety net before replace-all
  await handle.importBytes(bytes); // validates, then swaps

  // Re-apply the seeds EAGERLY. This is the step the Drive path does not need
  // and does not have: Drive stores a complete blob, whereas ours is
  // intentionally incomplete. apply*Seed is otherwise only called from the
  // grammar/kanji/vocab LIST paths, so without this the user's library would
  // look empty until they happened to visit all three pages. Non-fatal: if the
  // CDN is unreachable the rows simply stay pending, which is exactly today's
  // lazy behaviour and self-heals on the next list view.
  let reseeded = 0;
  try {
    reseeded = await reapplySeeds();
  } catch {
    /* offline → rows stay pending, refilled lazily later */
  }

  // Seed-drift check. The blob records WHICH rows were stripped; if the CDN
  // seed no longer covers some of them (slug renamed or dropped), those rows
  // are still pending with NULL content and that content is simply gone.
  // Without this the loss is completely silent.
  //
  // Run against a DETACHED copy of the now-live image (same approach as the
  // push path) rather than the live handle: BrowserDbHandle exposes no raw
  // sql.js instance, and widening that interface is outside this ticket.
  let warnings: UnreconstitutedRow[] = [];
  try {
    warnings = await checkSeedDrift(handle.exportBytes());
  } catch {
    /* no manifest / old blob → nothing to compare against */
  }

  // A pull is a sync point too: without recording it the reminder bar nags
  // immediately and findRestoreCandidate() offers a stale Drive save over the
  // cloud data we just restored.
  const { readBackupState, writeBackupState, markBackedUp } = await import("./state");
  const { getLessonCount, emitBackupChange } = await import("./controller");
  writeBackupState(
    markBackedUp(readBackupState(), getLessonCount(), Date.now(), { synced: true })
  );
  emitBackupChange();

  return { reseeded, warnings };
}

/**
 * Refill seed-derived content from the CDN. Runs the same apply*Seed functions
 * the list views use, for every profile in the restored save — so the strip's
 * inverse is the real restore path, not a copy of it.
 */
export async function reapplySeeds(): Promise<number> {
  const { getBrowserDb } = await import("@/db/browser");
  const handle = await getBrowserDb();

  const [
    { applyGrammarSeed },
    { applyKanjiSeed },
    { applyVocabSeed },
    { fetchGrammarSeed },
    { fetchKanjiSeed },
    { fetchVocabSeed },
    tables,
  ] = await Promise.all([
    import("@/core/grammar"),
    import("@/core/kanji"),
    import("@/core/vocab"),
    import("@/lib/grammar-seed"),
    import("@/lib/kanji-seed"),
    import("@/lib/vocab-seed"),
    import("@/db/schema"),
  ]);

  // nativeLanguage is read explicitly (listProfiles does not select it) because
  // it decides whether apply*Seed acts at all — the packaged content is
  // Turkish, and that is the same gate the strip respects.
  const profiles = handle.db
    .select({
      targetLanguage: tables.profiles.targetLanguage,
      nativeLanguage: tables.profiles.nativeLanguage,
    })
    .from(tables.profiles)
    .all();

  let filled = 0;
  for (const p of profiles) {
    const lang = p.targetLanguage;
    const native = p.nativeLanguage === "en" ? "en" : "tr";
    const [g, k, v] = await Promise.all([
      fetchGrammarSeed(lang).catch(() => null),
      fetchKanjiSeed(lang).catch(() => null),
      fetchVocabSeed(lang).catch(() => null),
    ]);
    if (g) filled += applyGrammarSeed(handle.db, lang, g, native);
    if (k) filled += applyKanjiSeed(handle.db, lang, k, native);
    if (v) filled += applyVocabSeed(handle.db, lang, v, native);
  }
  if (filled > 0) await handle.persistNow();
  return filled;
}
