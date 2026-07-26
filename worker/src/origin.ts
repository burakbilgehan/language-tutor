import type { Env } from "./env";

/**
 * Origin allowlist + CORS.
 *
 * Threat frame (T-046 acceptance criterion 1, same class as the T-039 bridge
 * CSRF bug): this Worker holds a cookie-authenticated API. A cookie is attached
 * by the browser on ANY cross-site request to this origin, so without an origin
 * check, evil.example can `fetch("https://…/api/save", {method:"PUT",
 * credentials:"include"})` and overwrite the victim's save. `SameSite=Lax`
 * blocks most of that, but it is a defence-in-depth default that browsers have
 * repeatedly relaxed for compatibility — it is not the whole control.
 *
 * The rule enforced here:
 *   - Non-allowlisted `Origin` on ANY method → 403, before anything runs.
 *   - Mutating method (anything but GET/HEAD/OPTIONS) with NO `Origin` header
 *     at all → 403. See requireBrowserOrigin() for why this is strict.
 *   - OPTIONS from an allowlisted origin → 204 preflight, credentials allowed.
 *
 * `TRUSTED_ORIGINS` is parsed ONCE here and the same array is handed to
 * `betterAuth({ trustedOrigins })`. better-auth runs its own origin check for
 * /api/auth/*; feeding both from one list means the two layers can never
 * disagree about what is trusted.
 */

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Parse the comma-separated env var into a normalized origin list. */
export function trustedOrigins(env: Env): string[] {
  return (env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeOrigin);
}

/** Origins compare as serialized `scheme://host[:port]`, no trailing slash. */
function normalizeOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/+$/, "");
  }
}

export function isTrustedOrigin(origin: string | null, allowed: string[]): boolean {
  if (!origin) return false;
  return allowed.includes(normalizeOrigin(origin));
}

/**
 * Origin gate for the app's own API surface.
 *
 * Returns a Response to send INSTEAD of running the route (403 or the 204
 * preflight), or null to continue.
 *
 * Missing-Origin policy: rejected for mutating methods. Every legitimate caller
 * of a mutating route in this design is a browser `fetch`, and browsers always
 * send `Origin` on those. Accepting the header's absence would leave a hole for
 * any non-browser client that a CSRF attack could imitate; rejecting makes the
 * property unconditional. The cost is that curl must pass `-H "Origin: …"`,
 * which the README documents.
 *
 * Same-origin GETs (a plain navigation to a static page, `GET /api/health`)
 * legitimately carry no Origin, so read methods are not subject to that rule —
 * they are still subject to the allowlist when an Origin IS present.
 */
export function guardOrigin(request: Request, allowed: string[]): Response | null {
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    // A preflight without a trusted origin gets a bare 403: never reflect an
    // untrusted origin, and never answer with `*` — a wildcard combined with
    // `Allow-Credentials: true` is rejected by browsers anyway.
    if (!isTrustedOrigin(origin, allowed)) {
      return new Response(null, { status: 403, headers: { vary: "Origin" } });
    }
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders(origin, allowed),
        "access-control-allow-methods": "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
        "access-control-allow-headers":
          request.headers.get("access-control-request-headers") ?? "content-type",
        "access-control-max-age": "600",
      },
    });
  }

  if (origin !== null && !isTrustedOrigin(origin, allowed)) {
    return forbidden("origin_not_allowed");
  }

  if (MUTATING.has(request.method) && origin === null) {
    return forbidden("origin_required");
  }

  return null;
}

/**
 * CORS response headers for an allowlisted origin. Empty for same-origin
 * requests (no Origin header) — those need no CORS at all, which is the whole
 * point of the same-origin hosting move.
 *
 * `Vary: Origin` is always set: the response differs by origin, and without it
 * a cache could serve one origin's CORS headers to another.
 */
export function corsHeaders(
  origin: string | null,
  allowed: string[]
): Record<string, string> {
  if (!isTrustedOrigin(origin, allowed)) return { vary: "Origin" };
  return {
    // Echo the exact allowlisted origin. `*` is invalid with credentials.
    "access-control-allow-origin": normalizeOrigin(origin as string),
    "access-control-allow-credentials": "true",
    vary: "Origin",
  };
}

function forbidden(code: string): Response {
  return new Response(JSON.stringify({ error: code }), {
    status: 403,
    headers: { "content-type": "application/json", vary: "Origin" },
  });
}
