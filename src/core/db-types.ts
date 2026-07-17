import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import type * as schema from "@/db/schema";

/**
 * Ortak DB tipi: hem sunucudaki better-sqlite3 hem tarayıcıdaki sql.js
 * sürücüsü bu senkron drizzle arayüzünü sağlar. src/core/* fonksiyonları
 * yalnızca bu tipi alır — @/db'yi (node) veya @/db/browser'ı (wasm) asla
 * import etmez; ortamı çağıran seçer. Böylece aynı iş mantığı hem API
 * route'larında hem statik build'de (tarayıcı) çalışır.
 */
export type AppDb = BaseSQLiteDatabase<"sync", unknown, typeof schema>;

// ÖNEMLİ KURAL: core modüllerde relational query API'si (db.query.*) KULLANMA.
// drizzle'ın sql-js sürücüsü relational sorgularda alan eşlemesini atlıyor
// (snake_case ham satır döner, JSON kolonlar parse edilmez) — query-builder
// (db.select().from()...) her iki sürücüde de doğru eşler. Tespit:
// scripts/test-sqljs-parity.ts.
