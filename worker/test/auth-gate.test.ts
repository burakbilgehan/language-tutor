import { describe, expect, it } from "vitest";
import { SELF, env } from "cloudflare:test";
// Vite inlines this at build time. `node:fs` is not usable here — the suite
// runs inside workerd, which has no real filesystem.
import indexSource from "../src/index.ts?raw";
import { routes } from "../src/routes";
import { migrate } from "./helpers/session";

/**
 * THE WORKER AUTH GATE (T-046 acceptance criterion 4).
 *
 * The Next app has `src/lib/auth.test.ts`, which walks `route.ts` files and
 * textually checks for `requireAuth(`. That shape does not transfer here — this
 * Worker has one dispatcher, not per-route files, so a textual scan would
 * mostly be testing itself.
 *
 * This gate is stronger: it enumerates the route table and, for every route not
 * deliberately allowlisted, fires a REAL unauthenticated request through the
 * real worked runtime and asserts a 401 — plus, for mutating routes, asserts
 * that nothing was written. That is criterion 3 ("nothing executes before auth")
 * verified rather than asserted.
 *
 * A new mutating route added without `auth: "required"` fails here. So does a
 * route added directly in `src/index.ts` to sidestep the table.
 */

/** Routes deliberately reachable without a session. Add ONLY with a
 * justification — mirrors OPEN_ROUTES in the Next app's src/lib/auth.test.ts. */
const OPEN_ROUTES: Record<string, string> = {
  "/api/auth/":
    "better-auth's own endpoints. Requiring a session would be circular — these " +
    "endpoints EXIST to establish one. Not unprotected: better-auth enforces its " +
    "own origin/CSRF checks against trustedOrigins, fed from the same allowlist " +
    "src/origin.ts parses.",
  "/api/health":
    "Liveness probe. No DB read, no R2 touch, no user data, no mutation — " +
    "returns a constant boolean. Mirrors the Next app's health/llm entry.",
  "/api/llm-catalog":
    "T-058: public versioned model catalog + freshness warnings. No user " +
    "data, no mutation, no session concept involved — the embedded build " +
    "catalog is always the working fallback, this is an optional overlay " +
    "fetch. Mirrors /api/health's open posture.",
};

const ORIGIN = "http://localhost:8787";

/** Same-origin browser-shaped request. The origin gate rejects mutating
 * requests with no Origin header, so tests must send one (see src/origin.ts). */
function req(pathname: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers);
  headers.set("origin", ORIGIN);
  return new Request(`${ORIGIN}${pathname}`, { ...init, headers });
}

describe("route table inventory", () => {
  it("every route is either auth-required or justified in OPEN_ROUTES", () => {
    const ungated: string[] = [];
    const stale = new Set(Object.keys(OPEN_ROUTES));

    for (const route of routes) {
      if (route.auth === "required") {
        expect(
          Object.keys(OPEN_ROUTES),
          `${route.path} is auth:"required" but also allowlisted — contradictory`
        ).not.toContain(route.path);
        continue;
      }
      stale.delete(route.path);
      if (!(route.path in OPEN_ROUTES)) ungated.push(route.path);
    }

    expect(
      ungated,
      `open routes with no justification (set auth:"required" or add to OPEN_ROUTES): ${ungated.join(", ")}`
    ).toEqual([]);
    expect(
      [...stale],
      `OPEN_ROUTES entries matching no route: ${[...stale].join(", ")}`
    ).toEqual([]);
  });

  it("no mutating route is open", () => {
    const mutatingOpen = routes
      .filter((r) => r.auth === "open")
      .filter((r) => r.methods.some((m) => ["POST", "PUT", "PATCH", "DELETE"].includes(m)))
      // /api/auth/ legitimately POSTs (sign-in, sign-out) and is justified above.
      .filter((r) => r.path !== "/api/auth/")
      .map((r) => r.path);

    expect(
      mutatingOpen,
      `mutating routes without auth: ${mutatingOpen.join(", ")}`
    ).toEqual([]);
  });

  it("index.ts does no path matching of its own (no table bypass)", () => {
    // Strip comments first — the file DOCUMENTS this rule in prose, and the
    // prose must not count as a violation of it.
    const code = indexSource
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    // The one permitted check is the /api/ prefix split between assets and the
    // dispatcher. Any OTHER pathname comparison would be a route bypassing the
    // table — and therefore bypassing the gate.
    const comparisons = [...code.matchAll(/pathname\s*(===|==|\.startsWith\()/g)];
    expect(
      comparisons.length,
      `src/index.ts must delegate all routing to the route table; found ${comparisons.length} pathname checks`
    ).toBe(1);
    expect(code).toContain('startsWith("/api/")');
  });
});

describe("auth-before-execute (criterion 3), enforced at runtime", () => {
  it.each(
    routes
      .filter((r) => r.auth === "required")
      .flatMap((r) => r.methods.map((m) => [r.path, m] as const))
  )("%s %s returns 401 without a session", async (pathname, method) => {
    const res = await SELF.fetch(
      req(pathname, {
        method,
        ...(method === "PUT" || method === "POST" ? { body: "payload" } : {}),
      })
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  // Parameterized over EVERY authed mutating route, not just /api/save, so a
  // second write route added to the table inherits this assertion instead of
  // quietly shipping without one.
  it.each(
    routes
      .filter((r) => r.auth === "required")
      .flatMap((r) =>
        r.methods
          .filter((m) => ["POST", "PUT", "PATCH", "DELETE"].includes(m))
          .map((m) => [r.path, m] as const)
      )
  )("unauthenticated %s %s causes NO side effect in R2", async (pathname, method) => {
    await migrate();
    const before = await env.SAVES.list();

    const res = await SELF.fetch(
      req(pathname, { method, body: "malicious payload" })
    );
    expect(res.status).toBe(401);

    const after = await env.SAVES.list();
    expect(after.objects.length).toBe(before.objects.length);
    expect(after.objects.map((o) => o.key)).toEqual(before.objects.map((o) => o.key));
  });

  it("a forged/garbage session cookie is rejected, not trusted", async () => {
    for (const cookie of [
      "better-auth.session_token=forged",
      // A structurally valid token with a bogus HMAC — proves the signature is
      // actually verified, not just parsed.
      "better-auth.session_token=abc123.deadbeefdeadbeefdeadbeefdeadbeef",
      "better-auth.session_token=",
    ]) {
      const res = await SELF.fetch(
        req("/api/save", { method: "PUT", body: "x", headers: { cookie } })
      );
      expect(res.status, cookie).toBe(401);
    }
  });
});
