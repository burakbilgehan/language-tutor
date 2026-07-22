import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { nanoid } from "nanoid";
import { inArray } from "drizzle-orm";
import { db, tables, resetDb, DB_PATH } from "@/db";
import { SAVE_SCHEMA_VERSION } from "./version";

import type { ErrorCode } from "@/lib/errors";

// Carries a stable error code (+ optional params) so the route/UI localize it
// instead of surfacing the Turkish message (T-031 Layer 1). The message stays
// as a developer-facing fallback.
export class SaveImportError extends Error {
  readonly code: ErrorCode;
  readonly params?: Record<string, string | number>;
  constructor(
    code: ErrorCode,
    message: string,
    params?: Record<string, string | number>
  ) {
    super(message);
    this.code = code;
    this.params = params;
  }
}

/**
 * Replace-all import: validates the uploaded SQLite snapshot, then atomically
 * swaps it in as the live database. The current progress is wiped (a single
 * timestamped .bak is kept for recovery). Throws SaveImportError with a Turkish
 * message on any validation failure — the live DB is untouched until every
 * check passes.
 */
export function importSave(bytes: Buffer): void {
  const dataDir = path.dirname(DB_PATH);
  fs.mkdirSync(dataDir, { recursive: true });
  const tmpPath = path.join(dataDir, `import-${nanoid()}.db`);
  fs.writeFileSync(tmpPath, bytes);

  // ---- Validate the incoming file (read-only, throwaway connection) --------
  try {
    let probe: Database.Database | null = null;
    try {
      probe = new Database(tmpPath, { readonly: true, fileMustExist: true });
      const integrity = probe.pragma("integrity_check", {
        simple: true,
      }) as string;
      if (integrity !== "ok") {
        throw new SaveImportError(
          "save_invalid",
          "Kayıt dosyası bozuk görünüyor."
        );
      }

      let version = 0;
      try {
        const row = probe
          .prepare("SELECT value FROM save_meta WHERE key = 'schemaVersion'")
          .get() as { value?: string } | undefined;
        version = row?.value ? Number(row.value) : 0;
      } catch {
        version = 0; // no save_meta table → pre-feature / unknown
      }
      if (version !== SAVE_SCHEMA_VERSION) {
        throw new SaveImportError(
          "save_version_mismatch",
          `Kayıt sürümü uyumsuz (dosya: ${version}, beklenen: ${SAVE_SCHEMA_VERSION}).`,
          { file: version || "?", app: SAVE_SCHEMA_VERSION }
        );
      }

      // Sanity: it must actually be this app's DB.
      probe.prepare("SELECT count(*) FROM profiles").get();
    } finally {
      probe?.close();
    }
  } catch (err) {
    fs.rmSync(tmpPath, { force: true });
    if (err instanceof SaveImportError) throw err;
    throw new SaveImportError(
      "save_invalid",
      "Kayıt dosyası okunamadı veya geçersiz."
    );
  }

  // ---- Swap (close live handle, back up, move file in, reopen) -------------
  resetDb(); // closes the current connection so the file handle is released

  const backupPath = `${DB_PATH}.bak-${Date.now()}`;
  try {
    if (fs.existsSync(DB_PATH)) fs.renameSync(DB_PATH, backupPath);
    // Remove stale WAL/SHM sidecars of the old DB.
    for (const sidecar of [`${DB_PATH}-wal`, `${DB_PATH}-shm`]) {
      if (fs.existsSync(sidecar)) fs.rmSync(sidecar, { force: true });
    }
    fs.renameSync(tmpPath, DB_PATH);
  } catch {
    // Best-effort rollback if the move failed mid-way.
    if (!fs.existsSync(DB_PATH) && fs.existsSync(backupPath)) {
      fs.renameSync(backupPath, DB_PATH);
    }
    fs.rmSync(tmpPath, { force: true });
    throw new SaveImportError(
      "save_load_failed",
      "Kayıt yüklenirken dosya değiştirilemedi."
    );
  }

  // Touch the db so the next request reopens against the new file, and make
  // sure it's back in WAL mode (a serialized image may carry a different
  // journal mode).
  db.$client.pragma("journal_mode = WAL");

  // Belt-and-suspenders: exportSave (src/lib/save/export.ts) already strips
  // in-flight generation_jobs rows, but saves taken before that fix are still
  // out there. Any queued/running job surviving into an import would get
  // adopted by recoverStaleJobs on next boot and start burning LLM tokens
  // unasked — cancel them here instead. Reusing the "error" status (no
  // "cancelled" value exists, and adding one would be a schema churn for no
  // real gain); the message makes clear this isn't a generation failure.
  db.update(tables.generationJobs)
    .set({
      status: "error",
      error: "İçe aktarılan kayıttan iptal edildi.",
      finishedAt: new Date(),
    })
    .where(inArray(tables.generationJobs.status, ["queued", "running"]))
    .run();
}
