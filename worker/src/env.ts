export interface Env {
  DB: D1Database;
  SAVES: R2Bucket;
  /** Static assets binding. Optional: absent in the test environment, where no
   * assets directory is configured (the tests only exercise /api/*). */
  ASSETS?: Fetcher;

  /** Public origin of BOTH the site and the API — they are same-origin.
   * Also the base for better-auth's OAuth callback URL, and the source from
   * which better-auth derives the cookie `Secure` flag (http → off, https → on). */
  BETTER_AUTH_URL: string;
  /** Comma-separated origin allowlist. Parsed once in src/origin.ts and shared
   * with better-auth's `trustedOrigins`. */
  TRUSTED_ORIGINS: string;

  // Secrets (`.dev.vars` locally, `wrangler secret put` in production).
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}
