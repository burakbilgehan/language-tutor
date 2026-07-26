import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import type { Env } from "./env";

/**
 * better-auth must be constructed INSIDE the request scope.
 *
 * Cloudflare bindings (`env.DB`, `env.SAVES`) only exist per-request; a
 * module-scope `betterAuth({ database: env.DB })` would capture `undefined`.
 * We memoize per-isolate keyed on the D1 binding identity so we pay the
 * construction cost once per isolate rather than once per request.
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
    // better-auth >= 1.6 accepts a raw D1Database binding in its `database`
    // union directly — no Kysely dialect and no community adapter needed.
    database: env.DB,

    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: (env.TRUSTED_ORIGINS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),

    // Spike-only: lets curl prove session create/read through D1 without an
    // external identity provider in the loop. T-046 decides whether this
    // provider ships at all (the ticket scopes production to Google + magic-link).
    emailAndPassword: { enabled: true },

    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
      },
    },

    plugins: [
      magicLink({
        // Stubbed sender: logs the link instead of emailing it. T-046 swaps
        // this for the real provider chosen in the T-045 report.
        sendMagicLink: async ({ email, url }) => {
          console.log(`[magic-link] to=${email} url=${url}`);
        },
      }),
    ],
  });
}
