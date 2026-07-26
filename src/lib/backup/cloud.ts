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
  stripSeedContent,
  type SeedBundle,
  type StripExec,
  type StripStats,
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

/** Header carrying the save-format version, matched in worker/src/routes.ts. */
const VERSION_HEADER = "x-lt-schema-version";

/** Thrown when the user is not signed in. T-048 turns this into a sign-in
 * prompt; it is deliberately distinct from a transport failure. */
export class NotSignedInError extends Error {
  constructor() {
    super("not signed in");
    this.name = "NotSignedInError";
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

// ---------------------------------------------------------------------------
// sql.js adapter for the env-agnostic strip module
// ---------------------------------------------------------------------------

type SqlJsDatabase = import("sql.js").Database;

function sqlJsExec(db: SqlJsDatabase): StripExec {
  return {
    all: (sql, params = []) => {
      // sql.js returns [{columns, values}]; reshape into plain row objects so
      // the strip module stays driver-agnostic.
      const res = db.exec(sql, params as never);
      if (!res.length) return [];
      const { columns, values } = res[0];
      return values.map((row) =>
        Object.fromEntries(columns.map((c, i) => [c, row[i]]))
      ) as Record<string, unknown>[];
    },
    run: (sql, params = []) => db.run(sql, params as never),
  };
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
    const exec = sqlJsExec(copy);
    // Which languages does this save contain? Drives which seeds to fetch.
    const languages = exec
      .all(`SELECT DISTINCT target_language AS lang FROM profiles`)
      .map((r) => r.lang as string);
    const seeds = await loadSeeds(languages);

    const stripped = stripSeedContent(exec, seeds);
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
  if (res.status === 413) throw new AppError("save_invalid");
  if (!res.ok) throw new AppError("save_load_failed");

  const body = (await res.json()) as { updatedAt?: string };
  return {
    bytes: bytes.byteLength,
    originalBytes,
    stripped,
    updatedAt: body.updatedAt ?? new Date().toISOString(),
  };
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
export async function pullFromCloud(): Promise<{ reseeded: number }> {
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

  const { emitBackupChange } = await import("./controller");
  emitBackupChange();
  return { reseeded };
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
