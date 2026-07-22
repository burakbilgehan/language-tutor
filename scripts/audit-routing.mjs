#!/usr/bin/env node
// Routing regression guard (T-027). Next auto-prefixes basePath for <Link>,
// router.push/replace and useRouter — but NOT for the raw browser APIs
// `window.history.pushState/replaceState` and `window.location.href = ...`.
// On GitHub Pages (basePath /language-tutor) a bare path handed to those APIs
// rewrites the address bar off the basePath, which then 404s on refresh and
// can drop a click into the RSC `.txt` payload as a flat navigation.
//
// RULE: no bare path to a raw history/location API — wrap it in withBase()
// (src/lib/base-path.ts), which is identity in server mode.
//
// This is a SOURCE-level scan (the bug lives in runtime JS, not in the static
// HTML, so scanning out/ would miss it). Exits non-zero on any violation.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "src");

// A line is suspect if it assigns location.href or calls history.push/replaceState.
const CALL_RE =
  /(?:window\.)?(?:history\.(?:pushState|replaceState)\s*\(|location\.href\s*=)/;

// It is a violation only when the path argument on that line is a bare string
// literal starting with "/" that is NOT wrapped in withBase(...). Query-relative
// ("?..."), external (http), and API routes served by the server backend are ok.
const BARE_ABS_PATH_RE = /["'`]\/(?!\/)/; // "/..." (not "//host")

const violations = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) scan(full);
  }
}

function scan(file) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (!CALL_RE.test(line)) return;
    if (/withBase\s*\(/.test(line)) return; // correctly wrapped
    if (!BARE_ABS_PATH_RE.test(line)) return; // no bare "/..." literal (dynamic/relative)
    // server-only save export lives behind !IS_STATIC — allow an inline opt-out
    if (/audit-routing:allow/.test(line)) return;
    violations.push(`${path.relative(process.cwd(), file)}:${i + 1}: ${line.trim()}`);
  });
}

walk(ROOT);

if (violations.length) {
  console.error(
    "Routing audit FAILED — bare path to raw history/location API (wrap in withBase):"
  );
  for (const v of violations) console.error("  " + v);
  console.error(
    "\nSee src/lib/base-path.ts. If the call is server-only (!IS_STATIC), add an\n" +
      "// audit-routing:allow comment on that line with a reason."
  );
  process.exit(1);
}

console.log("Routing audit OK — no basePath-less raw navigation found.");
