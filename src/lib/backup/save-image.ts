// Browser save-image helpers (T-032). Two concerns the browser export path was
// missing versus the server's exportSave (src/lib/save/export.ts):
//   1. STAMP save_meta (schemaVersion + exportedAt). The browser export never
//      did this, so manual re-import of a browser-made save read a NaN version
//      and was already broken on main. Stamping fixes that at the root and lets
//      every restore path validate.
//   2. SCRUB in-flight generation_jobs rows (T-024 parity). Static mode doesn't
//      populate that table today, but the export path must not depend on that.
// A shared validator (header + schema version) guards EVERY restore path
// (Drive, snapshot, manual import) so a corrupt or wrong-version image can't
// silently replace good progress.

import type { Database as SqlJsDatabase } from "sql.js";
import { SAVE_SCHEMA_VERSION } from "@/lib/save/version";
import { AppError } from "@/lib/errors";
import {
  MAX_SAVE_BYTES,
  SQLITE_HEADER,
  FORBIDDEN_SQLITE_OBJECT_TYPES,
} from "@/lib/save/limits";

/**
 * Stamp save_meta + scrub queued/running generation_jobs on a live sql.js DB,
 * then serialize. Mirrors the server exportSave contract so browser saves are
 * interchangeable with server ones. Mutates save_meta/generation_jobs in place
 * (harmless: meta is export bookkeeping, and no legitimate queued job should
 * survive into a snapshot).
 */
export function stampAndSerialize(sqlite: SqlJsDatabase): Uint8Array {
  const at = Date.now();
  const meta: Record<string, string> = {
    schemaVersion: String(SAVE_SCHEMA_VERSION),
    exportedAt: String(at),
  };
  for (const [key, value] of Object.entries(meta)) {
    sqlite.run(
      "INSERT INTO save_meta (key, value) VALUES (?, ?) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value]
    );
  }
  // T-024 parity: never bake in-flight jobs into a save.
  try {
    sqlite.run(
      "DELETE FROM generation_jobs WHERE status IN ('queued','running')"
    );
  } catch {
    /* table may not exist on a very old image — nothing to scrub */
  }
  // T-042: error rows' raw_output can carry a misconfigured custom/bridge
  // provider's raw HTTP error body (possible Authorization/Bearer echo).
  // NULL it so the shared save snapshot can't leak it; keep the rest of
  // the error row (status, error message) intact.
  try {
    sqlite.run(
      "UPDATE generation_jobs SET raw_output = NULL WHERE status = 'error'"
    );
  } catch {
    /* table may not exist on a very old image — nothing to scrub */
  }
  return sqlite.export();
}

/**
 * Validate a save image before it replaces live data. Checks the SQLite magic
 * header and the stamped schema version. Throws AppError (localized) on
 * failure. Shared by Drive restore, snapshot restore, and manual import so no
 * path can swap in a corrupt / wrong-version image.
 *
 * `getSql` lazily provides the initialized sql.js module (so this stays usable
 * from any browser caller without each duplicating the wasm init).
 */
export async function validateSaveImage(
  bytes: Uint8Array,
  getSql: () => Promise<{ Database: new (b: Uint8Array) => SqlJsDatabase }>
): Promise<void> {
  // T-041 S4: cap the size BEFORE the bytes reach sql.js — a multi-GB "save"
  // would otherwise be handed straight to wasm and OOM/crash the tab. This runs
  // ahead of getSql() so an oversized image never even triggers wasm init.
  if (bytes.byteLength > MAX_SAVE_BYTES) {
    throw new AppError("save_invalid");
  }
  const header = new TextDecoder().decode(bytes.slice(0, SQLITE_HEADER.length));
  if (header !== SQLITE_HEADER) {
    throw new AppError("save_invalid");
  }
  const SQL = await getSql();
  const probe = new SQL.Database(bytes);
  try {
    try {
      const res = probe.exec(
        "SELECT value FROM save_meta WHERE key='schemaVersion'"
      );
      const version = Number(res[0]?.values?.[0]?.[0]);
      if (version !== SAVE_SCHEMA_VERSION) {
        throw new AppError("save_version_mismatch", {
          file: Number.isFinite(version) ? version : "?",
          app: SAVE_SCHEMA_VERSION,
        });
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      // save_meta missing entirely → treat as unknown/incompatible version.
      throw new AppError("save_version_mismatch", {
        file: "?",
        app: SAVE_SCHEMA_VERSION,
      });
    }

    // T-041 S1 (browser parity with src/lib/save/import.ts): our schema has no
    // triggers and no views, so any in the image were put there by someone
    // else. Probing is safe (no writes → nothing fires), but this image is
    // about to become the live read-write DB where the first write WOULD fire
    // them. Reject rather than strip — see FORBIDDEN_SQLITE_OBJECT_TYPES.
    // Deliberately OUTSIDE the version try/catch above, whose catch-all
    // rewrites every error into save_version_mismatch.
    const hostile = probe.exec(
      "SELECT type, name FROM sqlite_master WHERE type IN (" +
        FORBIDDEN_SQLITE_OBJECT_TYPES.map((t) => `'${t}'`).join(", ") +
        ") LIMIT 1"
    );
    if (hostile[0]?.values?.length) {
      throw new AppError("save_invalid");
    }
  } finally {
    probe.close();
  }
}
