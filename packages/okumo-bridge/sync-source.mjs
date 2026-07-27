#!/usr/bin/env node
// Canonical source is ../../scripts/llm-bridge.mjs (repo root). This copies
// it verbatim into bin/okumo-bridge.mjs so the published tarball always
// carries a fresh, self-contained copy — no local imports, no drift.
// Runs automatically on `npm pack` / `npm publish` (prepack hook) and can
// be run manually after editing the source: `node sync-source.mjs`.
import { copyFileSync, chmodSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(here, "..", "..", "scripts", "llm-bridge.mjs");
const dest = path.join(here, "bin", "okumo-bridge.mjs");

copyFileSync(source, dest);
chmodSync(dest, 0o755);

// Sanity check: the bin file must stay self-contained (only node: builtins)
// so the copy served from out/llm-bridge.mjs and the npx path never diverge
// in what they require.
const contents = readFileSync(dest, "utf8");
const localImport = /from\s+["']\.\.?\//.exec(contents);
if (localImport) {
  throw new Error(
    `okumo-bridge bin file has a local import (${localImport[0]}) — it must stay a single self-contained file. Fix scripts/llm-bridge.mjs before packing.`
  );
}

console.log(`synced ${path.relative(process.cwd(), source)} -> ${path.relative(process.cwd(), dest)}`);
