export interface Env {
  DB: D1Database;
  SAVES: R2Bucket;

  BETTER_AUTH_URL: string;
  TRUSTED_ORIGINS: string;

  // Secrets (`.dev.vars` locally, `wrangler secret put` in production).
  BETTER_AUTH_SECRET: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}
