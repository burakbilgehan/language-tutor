import { getAuth } from "./auth";
import { corsHeaders, guardOrigin, trustedOrigins } from "./origin";
import { json, matchRoute } from "./routes";
import type { Env } from "./env";

/**
 * The single entry point for /api/*. Fixed pipeline, in this order:
 *
 *   1. route lookup       — unknown path → 404, nothing else runs
 *   2. origin gate        — allowlist + OPTIONS preflight (skipped for
 *                           /api/auth/*, which better-auth guards itself)
 *   3. session resolution — for `auth: "required"` routes, BEFORE the handler
 *                           is even reachable
 *   4. handler
 *
 * Steps 2 and 3 both precede any body access. `request.body` is untouched until
 * a handler runs, so an unauthenticated PUT causes no read, no R2 write, no D1
 * write — acceptance criterion 3.
 */
export async function dispatch(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const allowed = trustedOrigins(env);
  const origin = request.headers.get("origin");

  const route = matchRoute(url, request.method);

  if (route === null) {
    return withCors(json({ error: "not_found" }, 404), origin, allowed);
  }

  // better-auth's endpoints handle their own OPTIONS/origin logic; our
  // allowlist would reject the legitimate cross-site Google callback redirect.
  const skipOriginGate = route !== "method_not_allowed" && route.path === "/api/auth/";

  if (!skipOriginGate) {
    const denied = guardOrigin(request, allowed);
    if (denied) return denied;
  }

  if (route === "method_not_allowed") {
    return withCors(json({ error: "method_not_allowed" }, 405), origin, allowed);
  }

  const auth = getAuth(env);
  const base = { request, env, auth, url };

  if (route.auth === "open") {
    return withCors(await route.handler(base), origin, allowed);
  }

  // AUTH BEFORE EXECUTE. The handler below cannot be called without the
  // resolved session this produces — see the AuthedCtx note in routes.ts.
  const resolved = await auth.api.getSession({ headers: request.headers });
  if (!resolved) {
    return withCors(json({ error: "unauthorized" }, 401), origin, allowed);
  }

  return withCors(await route.handler({ ...base, session: resolved }), origin, allowed);
}

/** Attach CORS/Vary without discarding the handler's own headers or body. */
function withCors(res: Response, origin: string | null, allowed: string[]): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders(origin, allowed))) {
    headers.set(k, v);
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
