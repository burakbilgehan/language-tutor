import type { BetterAuthOptions } from "better-auth";

/**
 * The single source of truth for better-auth's plugin/provider/cookie set.
 *
 * Two callers need the SAME option set but supply different `database` values:
 *
 *   - `src/auth.ts`      → `database: env.DB` (a live D1 binding, Workers only)
 *   - `schema-gen.config.ts` → `database: new DatabaseSync(":memory:")` (Node,
 *     for `@better-auth/cli generate`)
 *
 * In T-045 those two hand-mirrored each other and the ticket flagged the drift
 * risk. This module removes it: both spread the same object, so a provider or
 * plugin added here reaches the generated SQL schema automatically.
 *
 * CONSTRAINT: this file must import nothing Workers-specific. The better-auth
 * CLI loads it under plain Node; a `D1Database` type-only import is fine, a
 * runtime Workers API is not.
 */

export interface AuthOptionsInput {
  baseURL?: string;
  secret?: string;
  /** Already-parsed allowlist. Same list the dispatcher enforces — see origin.ts. */
  trustedOrigins?: string[];
  googleClientId?: string;
  googleClientSecret?: string;
}

export function authOptions(input: AuthOptionsInput): BetterAuthOptions {
  return {
    baseURL: input.baseURL,
    secret: input.secret,
    trustedOrigins: input.trustedOrigins ?? [],

    // Google is the ONLY identity provider (owner ruling, 2026-07-26).
    //
    // Deliberately absent, and both absences are load-bearing:
    //   - `emailAndPassword` — the T-045 spike enabled it so curl could mint a
    //     session without an IdP. Shipping it would be an open, unmoderated
    //     signup endpoint on a personal backend. Tests construct sessions via
    //     better-auth's internal adapter instead (see test/helpers/session.ts).
    //   - `magicLink` — cut with the ticket's scope reduction. Every email
    //     sender requires a verified sending domain, and the owner ruled out a
    //     custom domain, so there is no way to deliver the link.
    socialProviders: {
      google: {
        clientId: input.googleClientId ?? "",
        clientSecret: input.googleClientSecret ?? "",
      },
    },

    advanced: {
      // Self-documenting rather than load-bearing: these match better-auth's
      // own defaults. The app and the API are same-origin in production
      // (Worker static assets serve the site, the same Worker serves /api/*),
      // so the session cookie is first-party and `Lax` is sufficient — no
      // `SameSite=None` anywhere in this design.
      //
      // `secure` is NOT pinned here on purpose. better-auth derives it from
      // baseURL's protocol: http://localhost:8787 under `wrangler dev` → no
      // Secure flag (so the dev cookie round-trip works), https://…workers.dev
      // in production → Secure automatically. Hardcoding `useSecureCookies:
      // true` would break local development for zero production gain.
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
      },
    },

    plugins: [],
  };
}
