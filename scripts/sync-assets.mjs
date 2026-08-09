#!/usr/bin/env node
// Vendored stroke verisini public/'e senkronlar (statik build + tek kaynak:
// her iki mod da /strokes-data/<char>.json fetch eder). Dizin gitignore'da —
// predev/prebuild'de çalışır, idempotent (mtime karşılaştırmasız, hızlı link).
import fs from "node:fs";
import path from "node:path";

// LLM fixture bundle: tarayıcı fixture sağlayıcısı (NEXT_PUBLIC_LLM_FIXTURE=1,
// bkz. src/lib/llm/browser-fixture.ts) fs okuyamaz; fixtures/ içeriği tek bir
// commit'li bundle.json'a toplanır. Deterministik (sıralı) yazım: fixture
// değişmedikçe diff üretmez. Stroke senkronundan ÖNCE koşar; stroke verisi
// eksikse script erken çıkıyor.
const FIXTURE_DIR = "src/lib/llm/fixtures";
const FIXTURE_BUNDLE = path.join(FIXTURE_DIR, "bundle.json");
const bundle = { json: {}, text: {} };
for (const f of fs.readdirSync(FIXTURE_DIR).sort()) {
  if (f === "bundle.json") continue;
  const body = fs.readFileSync(path.join(FIXTURE_DIR, f), "utf8");
  const key = f.replace(/\.(json|txt)$/, "");
  if (f.endsWith(".json")) bundle.json[key] = JSON.parse(body);
  else if (f.endsWith(".txt")) bundle.text[key] = body;
}
const serialized = JSON.stringify(bundle);
const prevBundle = fs.existsSync(FIXTURE_BUNDLE)
  ? fs.readFileSync(FIXTURE_BUNDLE, "utf8")
  : null;
if (prevBundle !== serialized) fs.writeFileSync(FIXTURE_BUNDLE, serialized);
console.log(
  `[sync-assets] llm fixtures: ${Object.keys(bundle.json).length} json + ${Object.keys(bundle.text).length} txt${prevBundle === serialized ? " (değişmedi)" : ""}`
);

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
