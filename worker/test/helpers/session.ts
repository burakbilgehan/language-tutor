import { env, applyD1Migrations } from "cloudflare:test";
import { makeSignature } from "better-auth/crypto";
import { getAuth } from "../../src/auth";

/**
 * Test-only session construction.
 *
 * Google is the ONLY identity provider in shipped config, so a test cannot sign
 * in through the normal flow — the OAuth roundtrip needs a real Google. The
 * tempting shortcut (re-enable `emailAndPassword` "just for tests") is exactly
 * what the ticket forbids, because that config SHIPS.
 *
 * Instead we do what better-auth's own test utilities do: create the user and
 * session through the internal adapter, then hand-build the signed session
 * cookie. Seeding a raw D1 `session` row is NOT enough — the cookie value is
 * `${token}.${HMAC-SHA256(token, secret)}`, so an unsigned token is rejected.
 *
 * Everything here comes from better-auth's public subpath exports
 * (`better-auth/crypto`) plus `auth.$context`. We deliberately do not import
 * from `better-auth/dist/plugins/test-utils/*` — that path is not in the
 * package's `exports` map and would break on a patch bump.
 */

let migrated = false;

/** Create the better-auth tables in the per-test D1. Idempotent. */
export async function migrate(): Promise<void> {
  if (migrated) return;
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  migrated = true;
}

export interface TestSession {
  userId: string;
  /** Ready-to-send `Cookie` header value. */
  cookie: string;
}

/** Create a user + session and return the signed cookie header for it. */
export async function createTestSession(email: string): Promise<TestSession> {
  await migrate();

  const auth = getAuth(env);
  const ctx = await auth.$context;

  const user = await ctx.internalAdapter.createUser({
    email,
    name: email.split("@")[0],
    emailVerified: true,
  });

  const session = await ctx.internalAdapter.createSession(user.id);

  const secret = ctx.secret;
  const signed = `${session.token}.${await makeSignature(session.token, secret)}`;
  const name = ctx.authCookies.sessionToken.name;

  return { userId: user.id, cookie: `${name}=${signed}` };
}
