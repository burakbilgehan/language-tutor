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

const SQLITE_HEADER = "SQLite format 3";

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
  const header = new TextDecoder().decode(bytes.slice(0, 15));
  if (header !== SQLITE_HEADER) {
    throw new AppError("save_invalid");
  }
  const SQL = await getSql();
  const probe = new SQL.Database(bytes);
  try {
    const res = probe.exec("SELECT value FROM save_meta WHERE key='schemaVersion'");
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
    throw new AppError("save_version_mismatch", { file: "?", app: SAVE_SCHEMA_VERSION });
  } finally {
    probe.close();
  }
}
