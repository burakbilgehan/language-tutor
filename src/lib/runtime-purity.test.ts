import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

// T-069's replacement for the deleted auth.test.ts route-walker. The app has
// ONE runtime: the browser. Nothing under src/ may import node-only modules,
// or the "fixed on server, forgotten in the browser" bug class quietly comes
// back. Walks every src TS file and fails on imports of node: builtins,
// better-sqlite3, next/server, or the bare "@/db" server handle.
//
// Allowlist is by EXACT path, each entry with its justification; test files
// run under node and are exempt wholesale.
const ALLOWED = new Map<string, string>([
  ["src/db/index.ts", "script-only better-sqlite3 handle (blast, seed exports, parity harness)"],
  ["src/lib/llm/claude-cli.ts", "script-only CLI provider (node:child_process), reached via getProvider()"],
  ["src/lib/llm/config.ts", "script-only provider config reader (node:fs), reached via getProvider()"],
  ["src/lib/llm/fixture-provider.ts", "script-only fixture provider (node:fs); the browser twin is browser-fixture.ts"],
]);

const BANNED = [
  /from\s+["'](node:[^"']+)["']/,
  /require\(\s*["'](node:[^"']+)["']\s*\)/,
  /from\s+["'](better-sqlite3)["']/,
  /from\s+["'](next\/server)["']/,
  // Bare "@/db" is the server handle; "@/db/schema|browser|heals|ddl" are fine.
  /from\s+["'](@\/db)["']/,
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

test("no file under src/ imports node-only modules (browser is the only runtime)", () => {
  const root = process.cwd();
  const files = walk(path.join(root, "src"));
  assert.ok(files.length > 100, "walker found suspiciously few files");
  const violations: string[] = [];
  for (const file of files) {
    const rel = path.relative(root, file).split(path.sep).join("/");
    if (rel.endsWith(".test.ts")) continue; // tests run under node by definition
    if (ALLOWED.has(rel)) continue;
    const src = fs.readFileSync(file, "utf8");
    for (const re of BANNED) {
      const m = src.match(re);
      if (m) violations.push(`${rel}: imports "${m[1]}"`);
    }
  }
  assert.deepStrictEqual(
    violations,
    [],
    `node-only import under src/ — move the logic into core/browser code or justify an exact-path allowlist entry:\n${violations.join("\n")}`
  );
});

test("runtime-purity allowlist entries still exist", () => {
  for (const rel of ALLOWED.keys()) {
    assert.ok(fs.existsSync(path.join(process.cwd(), rel)), `stale allowlist entry: ${rel}`);
  }
});
