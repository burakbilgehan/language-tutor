import { describe, expect, it } from "vitest";
import { withCors } from "../src/dispatch";

/**
 * `Set-Cookie` must survive the dispatcher's response rebuild.
 *
 * `dispatch` re-wraps EVERY response (including all of better-auth's) to attach
 * CORS/Vary headers. `new Headers(res.headers)` is a known footgun here: in
 * several runtimes it collapses multiple `Set-Cookie` values into one
 * comma-joined header, which silently breaks cookie setting.
 *
 * This matters most on the ONE path that cannot be verified locally — the real
 * Google callback, which needs a live Google client. That response is the most
 * likely to carry two or more cookies (session set, OAuth state expired). So
 * this test stands in for the roundtrip we cannot run.
 */

describe("withCors preserves multiple Set-Cookie headers", () => {
  it("does not collapse two cookies into one header", () => {
    const original = new Response("ok");
    original.headers.append("set-cookie", "a=1; Path=/; HttpOnly; SameSite=Lax");
    original.headers.append("set-cookie", "b=2; Path=/; Max-Age=0");

    const out = withCors(original, "http://localhost:3000", [
      "http://localhost:3000",
    ]);

    const cookies = out.headers.getSetCookie();
    expect(cookies.length).toBe(2);
    expect(cookies[0]).toContain("a=1");
    expect(cookies[1]).toContain("b=2");
    // A collapsed header would show up as a single comma-joined string.
    expect(cookies[0]).not.toContain("b=2");
  });

  it("still attaches the CORS headers alongside the cookies", () => {
    const original = new Response("ok");
    original.headers.append("set-cookie", "a=1");
    const out = withCors(original, "http://localhost:3000", [
      "http://localhost:3000",
    ]);
    expect(out.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:3000"
    );
    expect(out.headers.get("access-control-allow-credentials")).toBe("true");
    expect(out.headers.getSetCookie().length).toBe(1);
  });
});
