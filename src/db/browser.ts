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

export type BrowserDb = DrizzleSqlJs<typeof schema>;

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
}

let handle: BrowserDbHandle | null = null;
let initPromise: Promise<BrowserDbHandle> | null = null;

async function create(): Promise<BrowserDbHandle> {
  const SQL = await initSqlJs({
    // sql-wasm.wasm public/ altında servis edilir.
    locateFile: (file) => `/${file}`,
  });

  const stored = await idbGet();
  let sqlite: SqlJsDatabase;
  if (stored) {
    sqlite = new SQL.Database(stored);
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
    exportBytes: () => sqlite.export(),
    importBytes: async (bytes: Uint8Array) => {
      sqlite.close();
      sqlite = new SQL.Database(bytes);
      sqlite.run("PRAGMA foreign_keys = ON");
      live = drizzle(sqlite, { schema });
      await idbPut(bytes);
    },
  };
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
