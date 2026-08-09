import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

type Db = BetterSQLite3Database<typeof schema> & {
  $client: Database.Database;
};

// Cached on globalThis so next dev HMR doesn't leak sqlite file handles.
const globalForDb = globalThis as unknown as {
  __db?: Db;
};

export const DB_PATH = path.join(process.cwd(), "data", "app.db");

function createDb(): Db {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema }) as Db;
}

function liveDb(): Db {
  return (globalForDb.__db ??= createDb());
}

// `db` is a lazy proxy: every property access resolves the live connection
// via `liveDb()`, so the file is only opened on first real use. T-069: this
// module is script-only tooling now (blast, seed exports, parity harness);
// the app itself runs on sql.js in the browser (src/db/browser.ts).
export const db: Db = new Proxy({} as Db, {
  get(_t, prop, receiver) {
    const target = liveDb();
    const value = Reflect.get(target as object, prop, receiver);
    return typeof value === "function" ? value.bind(target) : value;
  },
  has(_t, prop) {
    return prop in (liveDb() as object);
  },
}) as Db;

export * as tables from "./schema";
