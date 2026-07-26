import { describe, expect, it } from "vitest";
import { SELF } from "cloudflare:test";
import { createTestSession } from "./helpers/session";

/**
 * The positive path: a real signed session resolves, and the save route is
 * tenant-scoped to it.
 *
 * The session is minted through better-auth's internal adapter (see
 * helpers/session.ts) rather than a sign-up endpoint, because Google is the
 * only shipped provider and there IS no open signup endpoint. That is the
 * intended state, not a limitation.
 */

const ORIGIN = "http://localhost:8787";

/** Decode a binary (octet-stream) response body without the .text() warning. */
async function bodyText(res: Response): Promise<string> {
  return new TextDecoder().decode(await res.arrayBuffer());
}

function req(pathname: string, cookie: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers);
  headers.set("origin", ORIGIN);
  headers.set("cookie", cookie);
  return new Request(`${ORIGIN}${pathname}`, { ...init, headers });
}

describe("authenticated round trip", () => {
  it("a signed session cookie authenticates and scopes R2 to the user", async () => {
    const alice = await createTestSession("alice@example.com");

    const put = await SELF.fetch(
      req("/api/save", alice.cookie, { method: "PUT", body: "alice-save-bytes" })
    );
    expect(put.status).toBe(200);
    expect(await put.json()).toEqual({
      ok: true,
      key: `saves/${alice.userId}/latest.db`,
    });

    const get = await SELF.fetch(req("/api/save", alice.cookie));
    expect(get.status).toBe(200);
    // Read as bytes: the route serves application/octet-stream (saves are
    // SQLite images), and .text() on it warns about corruption.
    expect(await bodyText(get)).toBe("alice-save-bytes");
    expect(get.headers.get("x-lt-key")).toBe(`saves/${alice.userId}/latest.db`);
  });

  it("a second user cannot read the first user's blob", async () => {
    const alice = await createTestSession("alice2@example.com");
    const bob = await createTestSession("bob@example.com");

    await SELF.fetch(
      req("/api/save", alice.cookie, { method: "PUT", body: "alice-secret" })
    );

    // Bob's key is derived from HIS session, never from request input, so there
    // is no parameter he could tamper with to reach Alice's object.
    const bobGet = await SELF.fetch(req("/api/save", bob.cookie));
    expect(bobGet.status).toBe(404);
    expect(await bobGet.json()).toEqual({
      error: "not_found",
      key: `saves/${bob.userId}/latest.db`,
    });

    // Alice's data is untouched.
    const aliceGet = await SELF.fetch(req("/api/save", alice.cookie));
    expect(await bodyText(aliceGet)).toBe("alice-secret");
  });

  it("get-session through better-auth's own endpoint resolves the user", async () => {
    const carol = await createTestSession("carol@example.com");
    const res = await SELF.fetch(req("/api/auth/get-session", carol.cookie));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user?: { id: string; email: string } };
    expect(body.user?.id).toBe(carol.userId);
    expect(body.user?.email).toBe("carol@example.com");
  });
});

describe("shipped config has no password provider", () => {
  // NOTE ON SHAPE: better-auth registers the email endpoints unconditionally
  // and refuses at runtime when `emailAndPassword.enabled` is falsy (see
  // api/routes/sign-up.mjs: throws BAD_REQUEST
  // "EMAIL_PASSWORD_SIGN_UP_DISABLED"). So the assertion is 400-with-that-code,
  // NOT 404. Asserting the code rather than just the status is what makes this
  // a real gate: if someone re-enables the provider, the endpoint starts
  // creating users and both the status and the code change.

  it("sign-up/email refuses: no open signup on this backend", async () => {
    const res = await SELF.fetch(
      new Request(`${ORIGIN}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { origin: ORIGIN, "content-type": "application/json" },
        body: JSON.stringify({
          email: "intruder@example.com",
          password: "hunter2hunter2",
          name: "intruder",
        }),
      })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code?: string };
    expect(body.code).toBe("EMAIL_PASSWORD_SIGN_UP_DISABLED");

    // And prove the refusal had no side effect: the user was not created.
    const session = await SELF.fetch(
      new Request(`${ORIGIN}/api/auth/get-session`, { headers: { origin: ORIGIN } })
    );
    expect(await session.text()).not.toContain("intruder@example.com");
  });

  it("sign-in/email refuses too", async () => {
    const res = await SELF.fetch(
      new Request(`${ORIGIN}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { origin: ORIGIN, "content-type": "application/json" },
        body: JSON.stringify({ email: "a@b.c", password: "hunter2hunter2" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("magic-link endpoint does not exist (plugin removed)", async () => {
    const res = await SELF.fetch(
      new Request(`${ORIGIN}/api/auth/sign-in/magic-link`, {
        method: "POST",
        headers: { origin: ORIGIN, "content-type": "application/json" },
        body: JSON.stringify({ email: "a@b.c" }),
      })
    );
    expect(res.status).toBe(404);
  });
});

describe("google is the surviving provider", () => {
  it("sign-in/social google still starts the OAuth redirect", async () => {
    const res = await SELF.fetch(
      new Request(`${ORIGIN}/api/auth/sign-in/social`, {
        method: "POST",
        headers: { origin: ORIGIN, "content-type": "application/json" },
        body: JSON.stringify({ provider: "google", callbackURL: "/" }),
      })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { url?: string };
    expect(body.url).toContain("accounts.google.com");
    // PKCE + CSRF state are present — better-auth's own protections.
    expect(body.url).toContain("code_challenge");
    expect(body.url).toContain("state=");
    // The callback URI the owner must register in the Google console.
    expect(decodeURIComponent(body.url ?? "")).toContain("/api/auth/callback/google");
  });
});
