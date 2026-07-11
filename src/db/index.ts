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

/**
 * Closes the current connection and clears the cache so the next `db` access
 * reopens against whatever file is now at DB_PATH. Used by save-import, which
 * swaps the underlying app.db file. Safe to call when no db exists yet.
 */
export function resetDb() {
  const existing = globalForDb.__db;
  if (existing) {
    try {
      existing.$client.close();
    } catch {
      // already closed / never opened — ignore
    }
    globalForDb.__db = undefined;
  }
}

// `db` is a lazy proxy: every property access resolves the live connection via
// `liveDb()`, so after `resetDb()` the very next drizzle call transparently
// reopens. This preserves the `import { db }` contract across all call sites
// while making the file-swap in save-import safe (the module-eval `const`
// could not be reassigned otherwise).
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
