import { describe, expect, it } from "vitest";
import { SELF } from "cloudflare:test";

/**
 * Origin allowlist + CORS (T-046 acceptance criterion 1).
 *
 * The threat is the T-039 bridge-CSRF shape: a cookie-authenticated API called
 * from a browser attaches the cookie to cross-site requests too. These tests
 * pin the allowlist behaviour so a future relaxation is a test failure.
 */

const ALLOWED = "http://localhost:8787";
const ALLOWED_DEV = "http://localhost:3000";
const EVIL = "https://evil.example";

describe("origin allowlist", () => {
  it("rejects a mutating request from an untrusted origin BEFORE auth", async () => {
    const res = await SELF.fetch(
      new Request(`${ALLOWED}/api/save`, {
        method: "PUT",
        headers: { origin: EVIL },
        body: "x",
      })
    );
    // 403, not 401: the origin check fires first, so the attacker learns
    // nothing about session state.
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "origin_not_allowed" });
  });

  it("rejects a read from an untrusted origin too", async () => {
    const res = await SELF.fetch(
      new Request(`${ALLOWED}/api/health`, { headers: { origin: EVIL } })
    );
    expect(res.status).toBe(403);
  });

  it("rejects a mutating request with NO Origin header", async () => {
    // Documented policy: browsers always send Origin on mutating requests, so
    // its absence means a non-browser client, which CSRF could imitate.
    const res = await SELF.fetch(
      new Request(`${ALLOWED}/api/save`, { method: "PUT", body: "x" })
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "origin_required" });
  });

  it("allows a same-origin GET with no Origin header (plain navigation)", async () => {
    const res = await SELF.fetch(new Request(`${ALLOWED}/api/health`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    // Same-origin needs no CORS at all — that is the point of the hosting move.
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
    expect(res.headers.get("vary")).toBe("Origin");
  });

  it("allows the dev origin (localhost:3000 → :8787) with credentialed CORS", async () => {
    const res = await SELF.fetch(
      new Request(`${ALLOWED}/api/health`, { headers: { origin: ALLOWED_DEV } })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED_DEV);
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
    expect(res.headers.get("vary")).toBe("Origin");
  });
});

describe("OPTIONS preflight", () => {
  it("answers 204 for an allowlisted origin, echoing it (never *)", async () => {
    const res = await SELF.fetch(
      new Request(`${ALLOWED}/api/save`, {
        method: "OPTIONS",
        headers: {
          origin: ALLOWED_DEV,
          "access-control-request-method": "PUT",
          "access-control-request-headers": "content-type",
        },
      })
    );
    expect(res.status).toBe(204);
    // `*` with Allow-Credentials is rejected by browsers — must be the exact origin.
    expect(res.headers.get("access-control-allow-origin")).toBe(ALLOWED_DEV);
    expect(res.headers.get("access-control-allow-origin")).not.toBe("*");
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
    expect(res.headers.get("access-control-allow-methods")).toContain("PUT");
    expect(res.headers.get("access-control-allow-headers")).toContain("content-type");
    expect(res.headers.get("access-control-max-age")).toBe("600");
  });

  it("refuses a preflight from an untrusted origin with no CORS headers", async () => {
    const res = await SELF.fetch(
      new Request(`${ALLOWED}/api/save`, {
        method: "OPTIONS",
        headers: { origin: EVIL, "access-control-request-method": "PUT" },
      })
    );
    expect(res.status).toBe(403);
    // Critically: no allow-origin header at all, so the browser blocks the
    // actual request.
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("trustedOrigins is the same list better-auth uses", () => {
  it("parses the env var into normalized origins", async () => {
    const { trustedOrigins } = await import("../src/origin");
    const parsed = trustedOrigins({
      TRUSTED_ORIGINS: " http://localhost:8787/ ,http://localhost:3000,, ",
    } as never);
    expect(parsed).toEqual(["http://localhost:8787", "http://localhost:3000"]);
  });
});
