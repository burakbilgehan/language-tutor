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

  // /api/auth/* is exempt from OUR origin allowlist for real (non-OPTIONS)
  // methods: the Google callback is a legitimate cross-site top-level redirect
  // from accounts.google.com, and an allowlist check would break sign-in.
  // better-auth guards those endpoints itself, using the same parsed list.
  //
  // OPTIONS is NOT exempt, and that distinction is load-bearing. better-auth's
  // router 404s on OPTIONS, and a non-2xx preflight makes the browser block the
  // real request — which would break the dev flow (a credentialed
  // application/json POST from localhost:3000 to localhost:8787 is not
  // CORS-safelisted, so it preflights). Answering the preflight from the
  // allowlist is safe: a preflight carries no cookies and no body, and the
  // Google callback is a GET, so it is unaffected.
  //
  // The exemption is further narrowed to the endpoints that actually need it:
  // the OAuth start/callback pair. Everything else under /api/auth/* —
  // sign-out in particular — is a same-origin XHR from our own app and gets the
  // full allowlist check. Measured before narrowing: a cross-site
  // `POST /api/auth/sign-out` from evil.example returned 200 and cleared the
  // session cookies (forced-sign-out CSRF: a nuisance, not data access, but
  // free to close).
  const isOAuthHandshake =
    url.pathname.startsWith("/api/auth/callback/") ||
    url.pathname.startsWith("/api/auth/sign-in/social") ||
    url.pathname.startsWith("/api/auth/oauth2/");

  const exemptFromOriginGate =
    request.method !== "OPTIONS" &&
    route !== "method_not_allowed" &&
    route.path === "/api/auth/" &&
    isOAuthHandshake;

  if (!exemptFromOriginGate) {
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

/** Attach CORS/Vary without discarding the handler's own headers or body.
 * Exported for test/set-cookie.test.ts, which guards the Set-Cookie behaviour
 * on the one path (the real Google callback) we cannot exercise locally. */
export function withCors(res: Response, origin: string | null, allowed: string[]): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders(origin, allowed))) {
    headers.set(k, v);
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
