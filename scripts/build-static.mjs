#!/usr/bin/env node
// Static build: the ONLY build mode (T-069; output:'export' is unconditional
// in next.config.ts, so the old route-stashing machinery is gone with the
// API routes themselves).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function run(cmd, args, extraEnv = {}) {
  const r = spawnSync(cmd, args, {
    stdio: "inherit",
    env: { ...process.env, ...extraEnv },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// Routing regression guard (T-027): no bare path to raw history/location API.
run("node", ["scripts/audit-routing.mjs"]);
run("node", ["scripts/sync-assets.mjs"]);
run("npx", ["next", "build", "--turbopack"], {
  NEXT_PUBLIC_STATIC_BUILD: "1",
});

// Ship the bridge script with the site: curl/iwr + node is the PRIMARY
// install path (the npm package was deliberately never published, 2026-07-31;
// packages/okumo-bridge/ is archive, see T-059).
fs.copyFileSync("scripts/llm-bridge.mjs", "out/llm-bridge.mjs");
// Disable Jekyll for the _next directory on any Pages-style host.
fs.writeFileSync("out/.nojekyll", "");

buildServiceWorker();

function buildServiceWorker() {
  // T-095 offline shell: walk out/, inject the file list into the sw.js
  // template (public/sw.js). strokes-data is skipped on purpose: 31 MB of
  // hanzi stroke files that only the stroke trainer fetches on demand; the
  // runtime cache-first handler covers it after one online use.
  const outDir = path.join(process.cwd(), "out");
  const files = [];
  const walk = (dir, rel) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".nojekyll") continue;
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (relPath === "strokes-data") continue;
        walk(abs, relPath);
      } else if (entry.name !== "sw.js") {
        files.push(relPath.split(path.sep).join("/"));
      }
    }
  };
  walk(outDir, "");
  files.sort();

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const manifest = JSON.stringify(files);
  const template = fs.readFileSync(
    path.join(process.cwd(), "public", "sw.js"),
    "utf8"
  );
  // Content-derived version: the cache name (and with it the whole precache)
  // only changes when the manifest OR the sw.js template changes, so an
  // identical rebuild doesn't churn every client's cache while a logic edit
  // still gets a fresh bucket.
  const version = crypto
    .createHash("sha256")
    .update(`${base}\n${manifest}\n${template}`)
    .digest("hex")
    .slice(0, 12);

  const out = template
    .replace('"__OKUMO_VERSION__"', JSON.stringify(version))
    .replace('"__OKUMO_BASE__"', JSON.stringify(base))
    .replace("__OKUMO_PRECACHE__", manifest);
  fs.writeFileSync(path.join(outDir, "sw.js"), out);
  console.log(
    `sw.js: ${files.length} dosya precache manifesti, okumo-shell-${version}`
  );
}
