// Shared save-import limits (T-041). Kept free of node/browser-only imports so
// BOTH import paths can use the same numbers: the server validator
// (src/lib/save/import.ts) and the browser one (src/lib/backup/save-image.ts).
//
// Known duplication: src/app/api/save/import/route.ts carries its own copy of
// the 100 MB cap as a request-level early-out (it rejects before ever reading
// the body into memory). That one is deliberately left in place; this constant
// is the validator-level backstop every non-route caller shares.

/** Hard ceiling for an imported save image. Anything bigger is not a save. */
export const MAX_SAVE_BYTES = 100 * 1024 * 1024; // 100 MB

/** First bytes of any SQLite 3 database file ("SQLite format 3\0" minus NUL). */
export const SQLITE_HEADER = "SQLite format 3";

/**
 * Names in sqlite_master that a legitimate export can contain. Drizzle's
 * migrations only ever emit tables and indexes — this app defines no triggers
 * and no views (verified against the real data/app.db and the drizzle/ output).
 *
 * So a trigger or view inside an imported file is, by construction, not ours.
 * We REJECT rather than strip: replace-all import already destroys the user's
 * current data, and quietly "repairing" a file that was built to attack them
 * is the wrong signal. A hard refusal keeps their existing save intact and
 * tells them the file is not a genuine one.
 *
 * Why this matters (T-041 S1): validation opens the file read-only and only
 * runs integrity_check + SELECTs, none of which fire triggers. After the swap
 * the same file is the live read-write DB, and the first app write detonates
 * whatever the attacker attached to that table.
 */
export const FORBIDDEN_SQLITE_OBJECT_TYPES = ["trigger", "view"] as const;
