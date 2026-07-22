"use client";

// Tarayıcı DB katmanı (statik build): sql.js (wasm SQLite, SENKRON — drizzle
// sql-js sürücüsü better-sqlite3 ile aynı .sync()/.run()/.get() API'sini
// verir, core kodu değişmeden çalışır). Kalıcılık: DB imajı IndexedDB'ye
// debounce'la yazılır + sekme gizlenince flush. Save export/import bu imajın
// kendisi — sunucu save formatıyla (raw SQLite) birebir uyumlu.

import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import { drizzle, type SQLJsDatabase as DrizzleSqlJs } from "drizzle-orm/sql-js";
import * as schema from "./schema";
import { DDL } from "./ddl";
import { withBase } from "@/lib/base-path";
import { stampAndSerialize, validateSaveImage } from "@/lib/backup/save-image";

export type BrowserDb = DrizzleSqlJs<typeof schema>;

// Additive column self-heals for images persisted by pre-v7 builds. ADD COLUMN
// with a NOT NULL DEFAULT backfills existing rows on read, so no data touch.
// Idempotent: re-running on an already-migrated image throws "duplicate column",
// swallowed by the caller. Keep in sync with schema.ts shape changes.
const COLUMN_HEALS: string[] = [
  "ALTER TABLE `translations` ADD COLUMN `native_language` text DEFAULT 'tr' NOT NULL",
  "ALTER TABLE `curricula` ADD COLUMN `content_lang` text",
  "ALTER TABLE `exercises` ADD COLUMN `lang` text DEFAULT 'tr' NOT NULL",
];

const IDB_NAME = "language-tutor";
const IDB_STORE = "sqlite";
const IDB_KEY = "image";

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(): Promise<Uint8Array | null> {
  const dbh = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = dbh.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(bytes: Uint8Array): Promise<void> {
  const dbh = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = dbh.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(bytes, IDB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------------------------------------------------------------- snapshots
// Last-K automatic local snapshots (T-032 Faz 1). Stored as EXTRA KEYS in the
// SAME object store as the live image — "snapshot-<epochMs>" — so no IndexedDB
// version bump / new object store / migration on existing users. They protect
// against bad-import / wrong-click (NOT against the browser wiping IndexedDB;
// that's what Drive sync is for). Rotation keeps the newest K.

export const SNAPSHOT_PREFIX = "snapshot-";
export const SNAPSHOT_KEEP = 5;

export interface SnapshotMeta {
  key: string;
  at: number;
  /** Byte size if cheaply known (only the just-taken snapshot); else null. */
  size: number | null;
}

function idbAllKeys(): Promise<string[]> {
  return idbOpen().then(
    (dbh) =>
      new Promise<string[]>((resolve, reject) => {
        const tx = dbh.transaction(IDB_STORE, "readonly");
        const req = tx.objectStore(IDB_STORE).getAllKeys();
        req.onsuccess = () =>
          resolve((req.result as IDBValidKey[]).map(String));
        req.onerror = () => reject(req.error);
      })
  );
}

function idbGetKey(key: string): Promise<Uint8Array | null> {
  return idbOpen().then(
    (dbh) =>
      new Promise<Uint8Array | null>((resolve, reject) => {
        const tx = dbh.transaction(IDB_STORE, "readonly");
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve((req.result as Uint8Array) ?? null);
        req.onerror = () => reject(req.error);
      })
  );
}

function idbPutKey(key: string, bytes: Uint8Array): Promise<void> {
  return idbOpen().then(
    (dbh) =>
      new Promise<void>((resolve, reject) => {
        const tx = dbh.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(bytes, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

function idbDeleteKey(key: string): Promise<void> {
  return idbOpen().then(
    (dbh) =>
      new Promise<void>((resolve, reject) => {
        const tx = dbh.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

/**
 * Snapshot metadata (newest first). Reads KEYS ONLY — timestamps are encoded in
 * the key name — so listing never pulls the (large) snapshot bytes. `size` is
 * left null; loading 5×~17MB just to show a size on the settings page isn't
 * worth it.
 */
export async function listSnapshots(): Promise<SnapshotMeta[]> {
  const keys = (await idbAllKeys()).filter((k) =>
    k.startsWith(SNAPSHOT_PREFIX)
  );
  return keys
    .map((key) => ({
      key,
      at: Number(key.slice(SNAPSHOT_PREFIX.length)) || 0,
      size: null as number | null,
    }))
    .sort((a, b) => b.at - a.at);
}

interface BrowserDbHandle {
  /** Canlı drizzle örneğine delege eden Proxy — import sonrası da geçerli
   * kalır (sunucudaki lazy `db` Proxy kalıbının aynısı). */
  db: BrowserDb;
  /** Bir yazma işleminden sonra çağır: imaj debounce'la IndexedDB'ye iner. */
  persistSoon: () => void;
  /** Navigasyon ÖNCESİ mutasyonlar için: yazmanın bittiğini bekler.
   * (persistSoon debounce'u tam sayfa yenilemeye yenilir — yarış olur.) */
  persistNow: () => Promise<void>;
  /** Save export: ham SQLite imajı (sunucu formatıyla aynı). */
  exportBytes: () => Uint8Array;
  /** Save import: imajı değiştir (replace-all) + kalıcılaştır. */
  importBytes: (bytes: Uint8Array) => Promise<void>;
  /** Otomatik yerel snapshot al (canlı imajın kopyası) + son K'ye buda. */
  takeSnapshot: () => Promise<SnapshotMeta>;
  /** Bir snapshot'ı canlı imaj yap (bad-import/yanlış-tık kurtarma). */
  restoreSnapshot: (key: string) => Promise<void>;
}

let handle: BrowserDbHandle | null = null;
let initPromise: Promise<BrowserDbHandle> | null = null;

async function create(): Promise<BrowserDbHandle> {
  const SQL = await initSqlJs({
    // sql-wasm.wasm public/ altında servis edilir.
    locateFile: (file) => withBase(`/${file}`),
  });

  const stored = await idbGet();
  let sqlite: SqlJsDatabase;
  if (stored) {
    sqlite = new SQL.Database(stored);
    // Additive self-heal: an image persisted by an older build may miss
    // tables added since (e.g. vocab_entries). DDL is CREATE TABLE/INDEX
    // only, so replaying it and swallowing "already exists" errors acts as
    // a poor-man's forward migration.
    for (const stmt of DDL) {
      try {
        sqlite.run(stmt);
      } catch {
        /* already exists */
      }
    }
    // Column additions can't ride CREATE TABLE replay (the table already
    // exists), so ADD COLUMN explicitly. Each is idempotent via try/catch on
    // "duplicate column" — safe to run every boot. (T-031 schema v7.)
    for (const stmt of COLUMN_HEALS) {
      try {
        sqlite.run(stmt);
      } catch {
        /* column already exists */
      }
    }
    // The translations unique key gained native_language (T-031). Rebuild the
    // index so an old image's (target, source) index becomes (target, native,
    // source); DROP+CREATE is idempotent.
    try {
      sqlite.run("DROP INDEX IF EXISTS `translation_text_idx`");
      sqlite.run(
        "CREATE UNIQUE INDEX `translation_text_idx` ON `translations` (`target_language`,`native_language`,`source_text`)"
      );
    } catch {
      /* index already in desired shape */
    }
  } else {
    sqlite = new SQL.Database();
    for (const stmt of DDL) sqlite.run(stmt);
  }
  sqlite.run("PRAGMA foreign_keys = ON");

  let live: BrowserDb = drizzle(sqlite, { schema });

  // Import DB imajını değiştirir; Proxy sayesinde elde tutulan `db`
  // referansları otomatik yeni bağlantıya gider.
  const dbProxy = new Proxy({} as BrowserDb, {
    get(_t, prop, receiver) {
      const value = Reflect.get(live as object, prop, receiver);
      return typeof value === "function" ? value.bind(live) : value;
    },
    has(_t, prop) {
      return prop in (live as object);
    },
  });

  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    void idbPut(sqlite.export()).catch((err) =>
      console.warn("[browser-db] persist başarısız:", err)
    );
  };
  const persistSoon = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, 800);
  };

  // Sekme kapanırken/gizlenirken bekleyen yazmaları kaçırma.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && timer) flush();
  });

  return {
    db: dbProxy,
    persistSoon,
    persistNow: async () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      await idbPut(sqlite.export());
    },
    exportBytes: () => stampAndSerialize(sqlite),
    importBytes: async (bytes: Uint8Array) => {
      // Validate header + schema version before swapping in — a corrupt or
      // wrong-version image must never silently replace good progress.
      await validateSaveImage(bytes, async () => SQL);
      sqlite.close();
      sqlite = new SQL.Database(bytes);
      sqlite.run("PRAGMA foreign_keys = ON");
      live = drizzle(sqlite, { schema });
      await idbPut(bytes);
    },
    takeSnapshot: () => doSnapshot(),
    restoreSnapshot: async (key: string) => {
      const bytes = await idbGetKey(key);
      if (!bytes) throw new Error(`snapshot not found: ${key}`);
      // Same guard as any other restore path.
      await validateSaveImage(bytes, async () => SQL);
      // Safety net: snapshot the CURRENT state before replacing it, so a
      // mis-click restore is itself undoable (mirrors restoreFromDrive).
      await doSnapshot();
      sqlite.close();
      sqlite = new SQL.Database(bytes);
      sqlite.run("PRAGMA foreign_keys = ON");
      live = drizzle(sqlite, { schema });
      await idbPut(bytes); // snapshot becomes the live image
    },
  };

  async function doSnapshot(): Promise<SnapshotMeta> {
    const bytes = stampAndSerialize(sqlite);
    const at = Date.now();
    const key = `${SNAPSHOT_PREFIX}${at}`;
    await idbPutKey(key, bytes);
    // Rotate: keep the newest SNAPSHOT_KEEP, delete the rest. Timestamps are
    // encoded in the key name, so rotation reads KEYS ONLY — never the (large)
    // snapshot bytes.
    const keys = (await idbAllKeys()).filter((k) =>
      k.startsWith(SNAPSHOT_PREFIX)
    );
    const { pruneToK } = await import("@/lib/backup/rotate");
    const doomed = pruneToK(
      keys.map((k) => ({
        id: k,
        at: Number(k.slice(SNAPSHOT_PREFIX.length)) || 0,
      })),
      SNAPSHOT_KEEP
    );
    await Promise.all(doomed.map((k) => idbDeleteKey(k)));
    return { key, at, size: bytes.byteLength };
  }
}

/** Tekil tarayıcı DB handle'ı (ilk çağrıda wasm + imaj yüklenir). */
export function getBrowserDb(): Promise<BrowserDbHandle> {
  if (handle) return Promise.resolve(handle);
  if (!initPromise) {
    initPromise = create().then((h) => {
      handle = h;
      return h;
    });
  }
  return initPromise;
}
