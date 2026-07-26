import { test, before } from "node:test";
import assert from "node:assert/strict";
import initSqlJs, { type SqlJsStatic } from "sql.js";
import { stampAndSerialize, validateSaveImage } from "./backup/save-image";
import { SAVE_SCHEMA_VERSION } from "./save/version";
import { AppError } from "./errors";

// sql.js in node loads its wasm from the package dist dir (same as the parity
// harness). Init lazily in a before() hook — top-level await isn't available
// under the cjs transform `npm test` uses.
let SQL: SqlJsStatic;
before(async () => {
  SQL = await initSqlJs({
    locateFile: (f: string) => `node_modules/sql.js/dist/${f}`,
  });
});
const getSql = async () => ({
  Database: SQL.Database as unknown as new (b: Uint8Array) => InstanceType<
    typeof SQL.Database
  >,
});

/** A minimal but valid app-shaped image: save_meta + generation_jobs + one row. */
function freshImage() {
  const db = new SQL.Database();
  db.run("CREATE TABLE save_meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)");
  db.run(
    "CREATE TABLE generation_jobs (id TEXT PRIMARY KEY, status TEXT NOT NULL)"
  );
  db.run("CREATE TABLE profiles (id TEXT PRIMARY KEY)");
  return db;
}

test("stampAndSerialize writes schemaVersion + exportedAt into save_meta", () => {
  const db = freshImage();
  const bytes = stampAndSerialize(db);
  db.close();

  const probe = new SQL.Database(bytes);
  const ver = probe.exec("SELECT value FROM save_meta WHERE key='schemaVersion'");
  const at = probe.exec("SELECT value FROM save_meta WHERE key='exportedAt'");
  assert.equal(Number(ver[0].values[0][0]), SAVE_SCHEMA_VERSION);
  assert.ok(Number(at[0].values[0][0]) > 0, "exportedAt stamped");
  probe.close();
});

test("stampAndSerialize scrubs queued/running generation_jobs (T-024 parity)", () => {
  const db = freshImage();
  db.run(
    "INSERT INTO generation_jobs (id,status) VALUES ('a','queued'),('b','running'),('c','done')"
  );
  const bytes = stampAndSerialize(db);
  db.close();

  const probe = new SQL.Database(bytes);
  const rows = probe.exec("SELECT id FROM generation_jobs ORDER BY id");
  probe.close();
  assert.deepEqual(
    rows[0].values.map((r) => r[0]),
    ["c"],
    "only the done job survives"
  );
});

test("validateSaveImage accepts a freshly stamped image", async () => {
  const db = freshImage();
  const bytes = stampAndSerialize(db);
  db.close();
  await validateSaveImage(bytes, getSql); // resolves without throwing
});

test("validateSaveImage rejects a non-SQLite blob", async () => {
  const bytes = new TextEncoder().encode("this is not a database at all");
  await assert.rejects(
    () => validateSaveImage(bytes, getSql),
    (err) => err instanceof AppError && err.code === "save_invalid"
  );
});

test("validateSaveImage rejects a wrong schema version", async () => {
  const db = freshImage();
  db.run(
    "INSERT INTO save_meta (key,value) VALUES ('schemaVersion', ?)",
    [String(SAVE_SCHEMA_VERSION + 99)]
  );
  const bytes = db.export();
  db.close();
  await assert.rejects(
    () => validateSaveImage(bytes, getSql),
    (err) => err instanceof AppError && err.code === "save_version_mismatch"
  );
});

// ---------------------------------------------------------------- T-041 S1/S4

test("validateSaveImage rejects an image carrying a user-defined trigger", async () => {
  const db = freshImage();
  // The ticket's exact attack shape: fires on the first legitimate app write
  // after the image has been swapped in as the live read-write DB.
  db.run(
    "CREATE TRIGGER evil AFTER INSERT ON generation_jobs BEGIN DELETE FROM profiles; END"
  );
  const bytes = stampAndSerialize(db);
  db.close();
  await assert.rejects(
    () => validateSaveImage(bytes, getSql),
    (err) => err instanceof AppError && err.code === "save_invalid"
  );
});

test("validateSaveImage rejects an image carrying a user-defined view", async () => {
  const db = freshImage();
  db.run("CREATE VIEW sneaky AS SELECT id FROM profiles");
  const bytes = stampAndSerialize(db);
  db.close();
  await assert.rejects(
    () => validateSaveImage(bytes, getSql),
    (err) => err instanceof AppError && err.code === "save_invalid"
  );
});

test("validateSaveImage rejects an oversized image before touching sql.js", async () => {
  const { MAX_SAVE_BYTES } = await import("./save/limits");
  // Fake length only — allocating 100 MB+ of real bytes just to prove a length
  // comparison would be wasteful. The point is that getSql() is never called.
  const huge = { byteLength: MAX_SAVE_BYTES + 1 } as unknown as Uint8Array;
  let sqlInitialized = false;
  await assert.rejects(
    () =>
      validateSaveImage(huge, async () => {
        sqlInitialized = true;
        return getSql();
      }),
    (err) => err instanceof AppError && err.code === "save_invalid"
  );
  assert.equal(sqlInitialized, false, "wasm must not be initialized");
});

test("validateSaveImage rejects an image with no save_meta (NaN version)", async () => {
  // A valid SQLite file that isn't a stamped save — the pre-existing broken case.
  const db = new SQL.Database();
  db.run("CREATE TABLE whatever (x INTEGER)");
  const bytes = db.export();
  db.close();
  await assert.rejects(
    () => validateSaveImage(bytes, getSql),
    (err) => err instanceof AppError && err.code === "save_version_mismatch"
  );
});
