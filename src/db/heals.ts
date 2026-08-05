// Additive column self-heals for databases produced by older builds. ADD
// COLUMN with a NOT NULL DEFAULT backfills existing rows on read, so no data
// touch. Every statement is idempotent via try/catch on "duplicate column" at
// the call sites. Keep in sync with schema.ts shape changes.
//
// Shared by BOTH runtimes on purpose (T-079): the browser replays these on
// every image load/import/restore (src/db/browser.ts healImage), and the
// server replays them after a save import (src/lib/save/import.ts). Additive
// no-bump schema changes make this list load-bearing: the save version gate
// cannot tell a pre-change image from a post-change one, so this replay is
// the only thing standing between an old save and a runtime throw (drizzle
// enumerates every declared column in `select()`).
export const COLUMN_HEALS: string[] = [
  "ALTER TABLE `translations` ADD COLUMN `native_language` text DEFAULT 'tr' NOT NULL",
  "ALTER TABLE `curricula` ADD COLUMN `content_lang` text",
  "ALTER TABLE `exercises` ADD COLUMN `lang` text DEFAULT 'tr' NOT NULL",
  // T-035 schema v8
  "ALTER TABLE `srs_cards` ADD COLUMN `lang` text DEFAULT 'tr' NOT NULL",
  "ALTER TABLE `chat_messages` ADD COLUMN `lang` text DEFAULT 'tr' NOT NULL",
  // T-079: per-profile curriculum pedagogy prompt. Nullable, so no backfill;
  // an absent value means "generate on first use". Deliberately shipped
  // WITHOUT a SAVE_SCHEMA_VERSION bump (import.ts compares versions with
  // strict equality, so a bump would refuse every existing save).
  "ALTER TABLE `profiles` ADD COLUMN `curriculum_pedagogy` text",
];
