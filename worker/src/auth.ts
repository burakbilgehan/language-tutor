import { betterAuth } from "better-auth";
import { authOptions } from "./auth-options";
import { trustedOrigins } from "./origin";
import type { Env } from "./env";

/**
 * better-auth must be constructed INSIDE the request scope.
 *
 * Cloudflare bindings (`env.DB`, `env.SAVES`) only exist per-request; a
 * module-scope `betterAuth({ database: env.DB })` would capture `undefined`.
 *
 * The module-level `cached` below is NOT request state (which would be a
 * cross-request leak) — it is derived configuration, keyed on the identity of
 * the D1 binding it was built from. Same binding → same config → safe to reuse
 * across requests in the isolate; a different binding (a different test env, a
 * different environment) rebuilds.
 */
let cached: { db: D1Database; auth: AuthInstance } | null = null;

export type AuthInstance = ReturnType<typeof createAuth>;

export function getAuth(env: Env): AuthInstance {
  if (cached && cached.db === env.DB) return cached.auth;

  const auth = createAuth(env);
  cached = { db: env.DB, auth };
  return auth;
}

function createAuth(env: Env) {
  return betterAuth({
    // Everything except the database comes from the shared fragment, which
    // schema-gen.config.ts spreads too — so the generated SQL schema cannot
    // drift from the running config.
    ...authOptions({
      baseURL: env.BETTER_AUTH_URL,
      secret: env.BETTER_AUTH_SECRET,
      // Same parsed list the dispatcher enforces (src/origin.ts). One source,
      // so better-auth's own origin check and ours cannot disagree.
      trustedOrigins: trustedOrigins(env),
      googleClientId: env.GOOGLE_CLIENT_ID,
      googleClientSecret: env.GOOGLE_CLIENT_SECRET,
    }),

    // better-auth >= 1.6 accepts a raw D1Database binding in its `database`
    // union directly — no Kysely dialect and no community adapter needed
    // (T-045 finding).
    database: env.DB,
  });
}
