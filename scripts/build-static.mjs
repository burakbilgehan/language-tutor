#!/usr/bin/env node
// Statik (GitHub Pages) build: output:'export' ile sunucusuz site üretir.
// API route'ları ve eski dinamik-segment redirect sayfaları statik export'la
// uyumsuz — build süresince kenara alınır, bitince geri konur. Sunuculu
// build'e (npm run build) dokunmaz.
//
// Crash-safety: taşıma süresince process kesilirse (Ctrl+C, kill, timeout)
// route'lar diskte "silinmiş" kalıyordu (bkz. T-017 incident'ı ve tekrarı).
// execSync sinyal işleyicilerini bloklar; o yüzden async spawn + SIGINT/
// SIGTERM/SIGHUP + exit üzerinde geri-koyma. SIGKILL'e karşı da açılıştaki
// stash-recovery duruyor.
import { spawn } from "node:child_process";
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

let restored = false;
function restore() {
  if (restored) return;
  restored = true;
  for (const [p, dst] of moved) {
    if (fs.existsSync(dst) && !fs.existsSync(p)) fs.renameSync(dst, p);
  }
  fs.rmSync(STASH, { recursive: true, force: true });
}

let activeChild = null;
process.on("exit", restore);
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => {
    if (activeChild) activeChild.kill(sig);
    restore();
    process.exit(1);
  });
}

function run(cmd, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const c = spawn(cmd, args, {
      stdio: "inherit",
      env: { ...process.env, ...extraEnv },
    });
    activeChild = c;
    c.on("error", reject);
    c.on("exit", (code) => {
      activeChild = null;
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with ${code}`));
    });
  });
}

let failed = false;
try {
  await run("node", ["scripts/sync-assets.mjs"]);
  await run("npx", ["next", "build", "--turbopack"], {
    NEXT_PUBLIC_STATIC_BUILD: "1",
    STATIC_EXPORT: "1",
  });
} catch {
  failed = true;
} finally {
  restore();
}

if (failed) process.exit(1);
// Köprü scriptini siteyle birlikte dağıt (kullanıcı tek dosya indirir).
fs.copyFileSync("scripts/llm-bridge.mjs", "out/llm-bridge.mjs");
// GitHub Pages: _next dizini için Jekyll'i kapat.
fs.writeFileSync("out/.nojekyll", "");
console.log("\nStatik site hazır: out/  (deploy: out/ → GitHub Pages)");
