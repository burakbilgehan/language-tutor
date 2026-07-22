import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { SAVE_SCHEMA_VERSION } from "./version";

/**
 * Takes a consistent snapshot of the live DB (VACUUM INTO a temp file — reads
 * committed state incl. WAL, never blocks the live connection) and strips
 * in-flight generation_jobs rows (queued/running) from the copy. If a save
 * export is taken mid-batch, those rows would otherwise get baked into the
 * snapshot and any session importing it would have recoverStaleJobs
 * (src/lib/jobs.ts) adopt them as orphans and start burning LLM tokens on its
 * own. done/error rows (job history) are left alone.
 *
 * Deliberately NOT `new Database(db.$client.serialize())`: SQLite cannot
 * deserialize a WAL-mode image in memory (SQLITE_CANTOPEN). The VACUUM INTO
 * copy is written in rollback-journal mode, which also makes the exported
 * file itself deserializable downstream.
 */
function snapshotWithoutJobQueue(): Buffer {
  const dir = mkdtempSync(join(tmpdir(), "language-tutor-save-"));
  const path = join(dir, "save.db");
  try {
    db.$client.prepare(`VACUUM INTO ?`).run(path);
    const copy = new Database(path);
    try {
      copy
        .prepare(
          `DELETE FROM generation_jobs WHERE status IN ('queued', 'running')`
        )
        .run();
      return copy.serialize();
    } finally {
      copy.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Produces a self-contained SQLite snapshot of the whole database as a Buffer,
 * ready to stream as a download. Stamps save_meta (schema version + export
 * time + profile id) and checkpoints the WAL so the serialized image is
 * complete. serialize() reads an in-memory image without touching the live
 * file on disk.
 */
export function exportSave(): { buffer: Buffer; filename: string } {
  const profile = getActiveProfile();

  const meta: Record<string, string> = {
    schemaVersion: String(SAVE_SCHEMA_VERSION),
    exportedAt: String(Date.now()),
    profileId: profile?.id ?? "",
  };
  for (const [key, value] of Object.entries(meta)) {
    db.insert(tables.saveMeta)
      .values({ key, value })
      .onConflictDoUpdate({ target: tables.saveMeta.key, set: { value } })
      .run();
  }

  const buffer = snapshotWithoutJobQueue();

  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "-")
    .slice(0, 13); // YYYYMMDD-HHmm
  return { buffer, filename: `language-tutor-save-${stamp}.db` };
}
