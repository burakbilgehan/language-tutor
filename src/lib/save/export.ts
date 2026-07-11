import { db, tables } from "@/db";
import { SAVE_SCHEMA_VERSION } from "./version";

/**
 * Produces a self-contained SQLite snapshot of the whole database as a Buffer,
 * ready to stream as a download. Stamps save_meta (schema version + export
 * time + profile id) and checkpoints the WAL so the serialized image is
 * complete. serialize() reads an in-memory image without touching the live
 * file on disk.
 */
export function exportSave(): { buffer: Buffer; filename: string } {
  const profile = db.query.profiles.findFirst().sync();

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
  const buffer = db.$client.serialize();

  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "-")
    .slice(0, 13); // YYYYMMDD-HHmm
  return { buffer, filename: `language-tutor-save-${stamp}.db` };
}
