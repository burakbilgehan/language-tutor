import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import * as schema from "./schema";

// Cached on globalThis so next dev HMR doesn't leak sqlite file handles.
const globalForDb = globalThis as unknown as {
  __db?: BetterSQLite3Database<typeof schema>;
};

function createDb() {
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const sqlite = new Database(path.join(dataDir, "app.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export const db = (globalForDb.__db ??= createDb());
export * as tables from "./schema";
