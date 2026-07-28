import type { Env } from "../src/env";
import type { D1Migration } from "@cloudflare/vitest-pool-workers";

/**
 * Types the `env` exported by `cloudflare:test` as our own `Env`, plus the
 * test-only bindings injected by vitest.config.ts.
 *
 * Without this, `env` is the empty `Cloudflare.Env` and every `env.DB` /
 * `env.SAVES` in the suite is a type error — which is what widening
 * tsconfig's `include` to cover test/ surfaced.
 */
declare global {
  namespace Cloudflare {
    interface Env extends WorkerEnv {
      /** Injected by vitest.config.ts; read by test/helpers/session.ts. */
      TEST_MIGRATIONS: D1Migration[];
      /** Injected by vitest.config.ts; read by test/catalog-route.test.ts to
       * opt in to the one live-network test. "1" to enable, "" (default) to
       * skip. */
      T058_LIVE_CHECK: string;
    }
  }
}

type WorkerEnv = Env;

export {};
