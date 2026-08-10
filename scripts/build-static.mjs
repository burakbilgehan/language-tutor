#!/usr/bin/env node
// Static build: the ONLY build mode (T-069; output:'export' is unconditional
// in next.config.ts, so the old route-stashing machinery is gone with the
// API routes themselves).
import { spawnSync } from "node:child_process";
import fs from "node:fs";

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
console.log("\nStatik site hazır: out/");
