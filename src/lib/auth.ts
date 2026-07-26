import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

// T-040 — single-operator auth gate for SERVER mode.
//
// Threat frame (T-026 / T-040): no server route has any auth, and there is one
// global DB. On localhost that is fine — one user, one machine. The moment the
// server is reachable from anywhere else, GET /api/save/export hands the whole
// database to an anonymous caller and POST /api/save/import replaces it.
//
// The gate is a single shared token from the environment:
//
//   APP_AUTH_TOKEN unset (or empty) → COMPLETE NO-OP. requireAuth() returns
//     null for every request, sets no header, no cookie, and reads nothing off
//     the request. The localhost single-user flow is byte-for-byte unchanged.
//     This invariant is load-bearing; do not add "helpful" behavior here.
//
//   APP_AUTH_TOKEN set → every mutating / data-exfiltrating route requires the
//     token, presented either as `Authorization: Bearer <token>` (curl, scripts)
//     or as the `lt_auth` cookie (the browser UI, which mostly cannot set
//     headers — save export is a plain `window.location.href` navigation).
//     The cookie is minted once by GET /api/auth?token=… (see the route).
//
// This is deliberately NOT a login system: no users, no sessions, no per-user
// data. Real multi-tenant isolation is T-043 and explicitly out of scope.
//
// Static mode (NEXT_PUBLIC_STATIC_BUILD=1) has no server routes at all, so none
// of this exists there.

export const AUTH_COOKIE = "lt_auth";

/** The configured token, or null when the gate is off. Empty/whitespace-only
 * counts as unset — `APP_AUTH_TOKEN=` must not enable a gate with an empty
 * secret that anything could satisfy. Read per call (not module-cached) so a
 * dev server picks up an env change on restart without stale state. */
export function authToken(): string | null {
  const raw = process.env.APP_AUTH_TOKEN;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Is the gate active at all? */
export function authEnabled(): boolean {
  return authToken() !== null;
}

/** Constant-time compare. timingSafeEqual throws on length mismatch and a bare
 * length pre-check leaks length, so both sides are hashed first — the digests
 * are always 32 bytes. */
export function tokenMatches(candidate: string | null | undefined): boolean {
  const expected = authToken();
  if (expected === null) return true; // gate off — nothing to match
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

function cookieToken(req: Request): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== AUTH_COOKIE) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return part.slice(eq + 1).trim();
    }
  }
  return null;
}

/** Does this request carry a valid token? (Gate off → always true.) */
export function isAuthed(req: Request): boolean {
  if (!authEnabled()) return true;
  return tokenMatches(bearerToken(req)) || tokenMatches(cookieToken(req));
}

/**
 * Route guard. Returns a 401 response when the gate is on and the request has
 * no valid token; returns null otherwise (including always, when the gate is
 * off). Mirrors requireLlm()'s shape:
 *
 *   const denied = requireAuth(req);
 *   if (denied) return denied;
 *
 * Call it FIRST in the handler — before requireLlm(), before req.json() /
 * req.formData() — so an unauthenticated caller neither makes the server parse
 * a large upload nor learns whether an LLM is configured.
 */
export function requireAuth(req: Request): NextResponse | null {
  if (isAuthed(req)) return null;
  return NextResponse.json(
    {
      error: "unauthorized",
      message:
        "Bu sunucu bir erişim token'ı ile korunuyor. / This server is protected by an access token.",
    },
    {
      status: 401,
      // Not a WWW-Authenticate challenge on purpose: a browser basic-auth
      // prompt would be the wrong UX for a bearer/cookie token.
      headers: { "Cache-Control": "no-store" },
    }
  );
}
