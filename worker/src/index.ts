import { dispatch } from "./dispatch";
import type { Env } from "./env";

/**
 * Worker entry point.
 *
 * Intentionally trivial. All /api/* routing lives in the route table
 * (src/routes.ts) and runs through one dispatcher (src/dispatch.ts), which
 * resolves auth before any handler is reachable.
 *
 * This file must contain NO path matching of its own — a hand-rolled
 * `if (url.pathname === …)` here would bypass the table and therefore the auth
 * gate. `test/auth-gate.test.ts` asserts that property against this source.
 *
 * Non-/api/* requests are static assets: `assets.run_worker_first: ["/api/*"]`
 * in wrangler.jsonc means the runtime serves assets directly and only invokes
 * this Worker for /api/*. The ASSETS fallback below covers the case where the
 * Worker is reached anyway (e.g. no assets directory configured in tests).
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS
        ? env.ASSETS.fetch(request)
        : new Response("not_found", { status: 404 });
    }

    return dispatch(request, env);
  },
};
