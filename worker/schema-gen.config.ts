/**
 * Config used ONLY by `@better-auth/cli generate` to emit the D1 SQL schema.
 *
 * The CLI runs under plain Node and cannot load `src/auth.ts` (that file needs
 * a live D1 binding, which only exists inside a Worker request). So this file
 * supplies a throwaway in-memory database instead.
 *
 * It does NOT hand-mirror the plugin/provider set any more — T-045 did, and the
 * ticket flagged the drift risk. Both this and `src/auth.ts` spread the same
 * `authOptions()` fragment, so the generated schema tracks the running config
 * automatically. `src/auth-options.ts` imports nothing Workers-specific
 * precisely so the Node CLI can load it.
 *
 * Regenerate with:
 *   npm run schema:generate
 */
import { betterAuth } from "better-auth";
import { DatabaseSync } from "node:sqlite";
import { authOptions } from "./src/auth-options";

export const auth = betterAuth({
  ...authOptions({
    baseURL: "http://localhost:8787",
    secret: "schema-generation-only",
    googleClientId: "x",
    googleClientSecret: "x",
  }),
  database: new DatabaseSync(":memory:"),
});
