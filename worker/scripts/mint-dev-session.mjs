// Dev-only: mint a signed session cookie against the LOCAL wrangler D1, so
// curl can exercise the authed save routes without a real Google sign-in.
// Prints a ready-to-use Cookie header value.
//
//   node scripts/mint-dev-session.mjs [email]
//
// Writes directly to the miniflare D1 sqlite file, then signs the token with
// the same HMAC better-auth uses (see test/helpers/session.ts for the same
// construction inside the test runtime).

import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
// Sign with better-auth's OWN helper rather than a hand-rolled HMAC: it emits
// standard base64 (+ / =), not base64url, and a hand-rolled base64url signature
// verifies as invalid — the session then silently resolves to null.
import { makeSignature } from "better-auth/crypto";

const email = process.argv[2] ?? "dev@example.com";

const secret = readFileSync(".dev.vars", "utf8")
  .split("\n")
  .find((l) => l.startsWith("BETTER_AUTH_SECRET="))
  ?.slice("BETTER_AUTH_SECRET=".length)
  .trim();
if (!secret) throw new Error("BETTER_AUTH_SECRET missing from .dev.vars");

const id = () => randomBytes(16).toString("hex");
const userId = id();
const token = randomBytes(32).toString("base64url");
const now = Date.now();
const iso = (ms) => new Date(ms).toISOString().replace("T", " ").slice(0, 19);

const sql = `
DELETE FROM session WHERE userId IN (SELECT id FROM user WHERE email = '${email}');
DELETE FROM user WHERE email = '${email}';
INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt)
  VALUES ('${userId}', '${email.split("@")[0]}', '${email}', 1, '${iso(now)}', '${iso(now)}');
INSERT INTO session (id, expiresAt, token, createdAt, updatedAt, userId)
  VALUES ('${id()}', '${iso(now + 7 * 864e5)}', '${token}', '${iso(now)}', '${iso(now)}', '${userId}');
`;

execFileSync(
  "npx",
  ["wrangler", "d1", "execute", "lt-auth", "--local", "--command", sql],
  { stdio: ["ignore", "ignore", "inherit"] }
);

// better-auth cookie value = `${token}.${HMAC-SHA256(token, secret)}`
const sig = await makeSignature(token, secret);
console.log(`better-auth.session_token=${token}.${sig}`);
console.error(`userId=${userId}`);
