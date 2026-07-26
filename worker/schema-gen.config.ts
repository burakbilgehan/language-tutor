/**
 * Throwaway config used ONLY by `@better-auth/cli generate` to emit the SQL
 * schema. The CLI runs under Node and cannot load `src/auth.ts` (that file
 * needs a live D1 binding, which only exists inside a Worker request).
 *
 * It must mirror the plugin/provider set in `src/auth.ts` exactly, otherwise
 * the generated schema will be missing tables/columns. Keep them in sync.
 */
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { DatabaseSync } from "node:sqlite";

export const auth = betterAuth({
  database: new DatabaseSync(":memory:"),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: { clientId: "x", clientSecret: "x" },
  },
  plugins: [magicLink({ sendMagicLink: async () => {} })],
});
