import { NextResponse } from "next/server";
import { AUTH_COOKIE, authEnabled, tokenMatches } from "@/lib/auth";

export const runtime = "nodejs";

// T-040 cookie bootstrap. The browser UI cannot attach an Authorization header
// to `window.location.href = "/api/save/export"` (a plain navigation), so the
// operator authenticates the browser once:
//
//   http://host:3000/api/auth?token=<APP_AUTH_TOKEN>
//
// …which validates the token and mints the `lt_auth` cookie. Every subsequent
// same-origin fetch and navigation carries it; no client code changes, no UI.
//
// Gate off → this route is inert (404), so nothing new exists on the localhost
// single-user path.

export function GET(req: Request) {
  if (!authEnabled()) {
    // No gate configured: do not hand out cookies, do not hint at a mechanism.
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!tokenMatches(token)) {
    return NextResponse.json(
      { error: "unauthorized", message: "Geçersiz token. / Invalid token." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, token!, {
    httpOnly: true,
    // Strict, not Lax: the cookie authenticates mutating routes, so a
    // cross-site POST to /api/save/import must NOT carry it (CSRF — the class
    // T-039 fought on the bridge). Same-site navigations, including the save
    // export download, still send it.
    sameSite: "strict",
    path: "/",
    // Only over HTTPS when the request itself is HTTPS — forcing Secure would
    // silently break the http://localhost / http://lan-ip operator flow.
    secure: url.protocol === "https:",
    maxAge: 60 * 60 * 24 * 30,
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/** Drop the cookie (log the browser out of the gate). */
export function DELETE() {
  if (!authEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
