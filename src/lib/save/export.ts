import Database from "better-sqlite3";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { SAVE_SCHEMA_VERSION } from "./version";

/**
 * Strips in-flight generation_jobs rows (queued/running) out of a serialized
 * SQLite image, on a throwaway second connection — never the live DB, so a
 * batch running at export time keeps running undisturbed. If a save export is
 * taken mid-batch, those rows would otherwise get baked into the snapshot and
 * any session importing it would have recoverStaleJobs (src/lib/jobs.ts)
 * adopt them as orphans and start burning LLM tokens on its own. done/error
 * rows (job history) are left alone.
 */
function stripJobQueue(buffer: Buffer): Buffer {
  const copy = new Database(buffer);
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

  // Fold WAL contents into the main image so the snapshot is complete.
  db.$client.pragma("wal_checkpoint(TRUNCATE)");
  const buffer = stripJobQueue(db.$client.serialize());

  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "-")
    .slice(0, 13); // YYYYMMDD-HHmm
  return { buffer, filename: `language-tutor-save-${stamp}.db` };
}
