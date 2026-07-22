// Bump this whenever the DB schema shape (src/db/schema.ts) changes, so a save
// exported on one machine is refused by an incompatible import on another.
// See CLAUDE.md "Save export/import".
export const SAVE_SCHEMA_VERSION = 7; // v7: translations.native_language + curricula.content_lang (T-031 içerik dil izolasyonu)
