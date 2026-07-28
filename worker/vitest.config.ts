import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";
import path from "node:path";

const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"));

export default defineConfig({
  plugins: [
    cloudflareTest({
      // Required so tests can import the Worker's own modules in the same
      // isolate as `SELF`.
      main: "src/index.ts",
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        // TEST-ONLY CONFIGURATION.
        //
        // This block is the ONLY place test values exist, and `wrangler deploy`
        // never reads vitest.config.ts — so none of it can reach production.
        // That is the whole reason sessions are minted through better-auth's
        // internal adapter (test/helpers/session.ts) instead of by re-enabling
        // `emailAndPassword` in src/auth-options.ts, which WOULD ship.
        bindings: {
          // Not a secret: it protects nothing but this ephemeral test D1.
          // Deliberately NOT read from .dev.vars — that file is gitignored, so
          // a suite depending on it would pass locally and fail in CI.
          BETTER_AUTH_SECRET: "test-secret-at-least-32-characters-long!!",
          BETTER_AUTH_URL: "http://localhost:8787",
          TRUSTED_ORIGINS: "http://localhost:8787,http://localhost:3000",
          GOOGLE_CLIENT_ID: "test-google-client-id",
          GOOGLE_CLIENT_SECRET: "test-google-client-secret",
          // Read by test/helpers/session.ts to create the auth tables.
          TEST_MIGRATIONS: migrations,
          // T-058: opt-in flag for the one test that hits the REAL
          // openrouter.ai (test/catalog-route.test.ts). Off by default so the
          // suite is fully offline/deterministic — a real model rename would
          // otherwise fail CI in a way that reads as "the feature is broken"
          // rather than "the catalog needs curating". Flip to "1" locally to
          // re-run the live proof; `process.env` is not reliably readable
          // inside workerd, hence a binding rather than an env var.
          T058_LIVE_CHECK: "",
        },
      },
    }),
  ],
});
