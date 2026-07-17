#!/usr/bin/env node
// Vendored stroke verisini public/'e senkronlar (statik build + tek kaynak:
// her iki mod da /strokes-data/<char>.json fetch eder). Dizin gitignore'da —
// predev/prebuild'de çalışır, idempotent (mtime karşılaştırmasız, hızlı link).
import fs from "node:fs";
import path from "node:path";

const SRC = "node_modules/@k1low/hanzi-writer-data-jp";
const DST = "public/strokes-data";

if (!fs.existsSync(SRC)) {
  console.warn("[sync-assets] stroke verisi yok (npm i çalıştı mı?)");
  process.exit(0);
}
fs.mkdirSync(DST, { recursive: true });
const files = fs.readdirSync(SRC).filter((f) => f.endsWith(".json"));
let copied = 0;
for (const f of files) {
  const dst = path.join(DST, f);
  if (!fs.existsSync(dst)) {
    fs.copyFileSync(path.join(SRC, f), dst);
    copied++;
  }
}
console.log(`[sync-assets] strokes: ${files.length} dosya (${copied} yeni)`);
