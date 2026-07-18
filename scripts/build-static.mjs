#!/usr/bin/env node
// Statik (GitHub Pages) build: output:'export' ile sunucusuz site üretir.
// API route'ları ve eski dinamik-segment redirect sayfaları statik export'la
// uyumsuz — build süresince kenara alınır, bitince geri konur. Sunuculu
// build'e (npm run build) dokunmaz.
import { execSync } from "node:child_process";
import fs from "node:fs";

const ASIDE = ["src/app/api"];
const STASH = ".static-build-aside";

// Önceki build yarıda kaldıysa stash'teki tek kopyayı silmeden önce geri koy.
if (fs.existsSync(STASH)) {
  for (const p of ASIDE) {
    const dst = `${STASH}/${p.replace(/\//g, "__")}`;
    if (fs.existsSync(dst) && !fs.existsSync(p)) fs.renameSync(dst, p);
  }
}
fs.rmSync(STASH, { recursive: true, force: true });
fs.mkdirSync(STASH, { recursive: true });
const moved = [];
for (const p of ASIDE) {
  if (fs.existsSync(p)) {
    const dst = `${STASH}/${p.replace(/\//g, "__")}`;
    fs.renameSync(p, dst);
    moved.push([p, dst]);
  }
}

let failed = false;
try {
  execSync("node scripts/sync-assets.mjs", { stdio: "inherit" });
  execSync("next build --turbopack", {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_STATIC_BUILD: "1",
      STATIC_EXPORT: "1",
    },
  });
} catch {
  failed = true;
} finally {
  for (const [p, dst] of moved) fs.renameSync(dst, p);
  fs.rmSync(STASH, { recursive: true, force: true });
}

if (failed) process.exit(1);
// Köprü scriptini siteyle birlikte dağıt (kullanıcı tek dosya indirir).
fs.copyFileSync("scripts/llm-bridge.mjs", "out/llm-bridge.mjs");
// GitHub Pages: _next dizini için Jekyll'i kapat.
fs.writeFileSync("out/.nojekyll", "");
console.log("\nStatik site hazır: out/  (deploy: out/ → GitHub Pages)");
