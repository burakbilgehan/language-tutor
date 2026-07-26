import { describe, expect, it } from "vitest";
import { SELF, env } from "cloudflare:test";
import { createTestSession } from "./helpers/session";

/**
 * T-047 save-sync behaviour, with a real session. The auth gate
 * (test/auth-gate.test.ts) covers the UNauthenticated side; everything here
 * needs a session and so belongs in its own file.
 *
 * What is asserted: round-trip byte fidelity, the size cap on both the honest
 * and the LYING Content-Length path (including that R2 is left clean),
 * schemaVersion storage + mismatch refusal, and tenant isolation.
 */

const ORIGIN = "http://localhost:8787";
const VERSION = "x-lt-schema-version";

function req(pathname: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers);
  headers.set("origin", ORIGIN);
  return new Request(`${ORIGIN}${pathname}`, { ...init, headers });
}

/**
 * A body whose Content-Length header UNDERSTATES the real size — the shape a
 * client would use to try to slip past the declared-size check and then send
 * more than it promised. Verified that the explicit header does survive into
 * the Worker (workerd does not recompute it for a stream body).
 */
function lyingBody(realBytes: number, declared: number): RequestInit {
  const chunkSize = 1024;
  const chunk = new Uint8Array(chunkSize).fill(7);
  let sent = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= realBytes) return controller.close();
      const n = Math.min(chunkSize, realBytes - sent);
      sent += n;
      controller.enqueue(chunk.subarray(0, n));
    },
  });
  return {
    method: "PUT",
    body: stream,
    // @ts-expect-error — non-standard but required to stream a body in workerd
    duplex: "half",
    headers: { "content-length": String(declared) },
  };
}

async function sha256(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

describe("save round-trip", () => {
  it("PUT then GET returns byte-identical content", async () => {
    const { cookie, userId } = await createTestSession("rt@example.com");
    // Not valid SQLite — deliberately. The Worker must be format-blind.
    const payload = new Uint8Array(4096).map((_, i) => i % 251);

    const put = await SELF.fetch(
      req("/api/save", {
        method: "PUT",
        body: payload,
        headers: { cookie, [VERSION]: "7" },
      })
    );
    expect(put.status).toBe(200);
    const body = (await put.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.key).toBe(`saves/${userId}/latest.db`);
    expect(body.schemaVersion).toBe("7");
    expect(body.bytes).toBe(payload.byteLength);

    const get = await SELF.fetch(req("/api/save", { headers: { cookie } }));
    expect(get.status).toBe(200);
    expect(get.headers.get(VERSION)).toBe("7");
    expect(get.headers.get("x-lt-updated-at")).toBeTruthy();

    const got = await get.arrayBuffer();
    expect(await sha256(got)).toBe(await sha256(payload.buffer as ArrayBuffer));
  });

  it("HEAD returns metadata with no body (the cheap 'what is in the cloud?' check)", async () => {
    const { cookie } = await createTestSession("head@example.com");
    const payload = new Uint8Array(2048).fill(3);
    await SELF.fetch(
      req("/api/save", {
        method: "PUT",
        body: payload,
        headers: { cookie, [VERSION]: "8" },
      })
    );

    const res = await SELF.fetch(req("/api/save", { method: "HEAD", headers: { cookie } }));
    expect(res.status).toBe(200);
    expect(res.headers.get(VERSION)).toBe("8");
    expect(res.headers.get("x-lt-updated-at")).toBeTruthy();
    expect(res.headers.get("content-length")).toBe(String(payload.byteLength));
    // The whole point: the size is reported without the object being read.
    expect((await res.arrayBuffer()).byteLength).toBe(0);
  });

  it("HEAD with no stored save is 404", async () => {
    const { cookie } = await createTestSession("head404@example.com");
    const res = await SELF.fetch(req("/api/save", { method: "HEAD", headers: { cookie } }));
    expect(res.status).toBe(404);
  });

  it("GET with no stored save is 404", async () => {
    const { cookie } = await createTestSession("empty@example.com");
    const res = await SELF.fetch(req("/api/save", { headers: { cookie } }));
    expect(res.status).toBe(404);
  });

  it("a second PUT overwrites (last-write-wins) and moves updatedAt forward", async () => {
    const { cookie } = await createTestSession("lww@example.com");
    const first = await SELF.fetch(
      req("/api/save", { method: "PUT", body: new Uint8Array([1, 1, 1]), headers: { cookie } })
    );
    const firstAt = ((await first.json()) as { updatedAt: string }).updatedAt;

    await new Promise((r) => setTimeout(r, 5));
    await SELF.fetch(
      req("/api/save", { method: "PUT", body: new Uint8Array([2, 2, 2, 2]), headers: { cookie } })
    );

    const get = await SELF.fetch(req("/api/save", { headers: { cookie } }));
    expect(new Uint8Array(await get.arrayBuffer())).toEqual(new Uint8Array([2, 2, 2, 2]));
    expect(get.headers.get("x-lt-updated-at")! >= firstAt).toBe(true);
  });
});

describe("schemaVersion gate", () => {
  it("refuses a pull whose stored version differs from the client's", async () => {
    const { cookie } = await createTestSession("ver@example.com");
    await SELF.fetch(
      req("/api/save", {
        method: "PUT",
        body: new Uint8Array([9]),
        headers: { cookie, [VERSION]: "3" },
      })
    );

    const res = await SELF.fetch(
      req("/api/save", { headers: { cookie, [VERSION]: "4" } })
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("save_version_mismatch");
    expect(body.stored).toBe("3");
    expect(body.expected).toBe("4");

    // The matching version still works — the gate is not simply "always refuse".
    const ok = await SELF.fetch(req("/api/save", { headers: { cookie, [VERSION]: "3" } }));
    expect(ok.status).toBe(200);
  });
});

describe("upload size cap", () => {
  it("rejects an honest oversize Content-Length with 413 and writes nothing", async () => {
    const { cookie, userId } = await createTestSession("big@example.com");
    const key = `saves/${userId}/latest.db`;
    expect(await env.SAVES.head(key)).toBeNull();

    const res = await SELF.fetch(
      req("/api/save", {
        method: "PUT",
        body: new Uint8Array(16),
        headers: { cookie, "content-length": String(64 * 1024 * 1024) },
      })
    );
    expect(res.status).toBe(413);
    expect(await env.SAVES.head(key)).toBeNull();
  });

  it("rejects a body that EXCEEDS its declared Content-Length, leaving no object", async () => {
    // The declared-size check alone is bypassable by lying, so the
    // FixedLengthStream is the real enforcement: a body larger than the
    // declared length must not be stored, and must not be stored TRUNCATED
    // either — a silently truncated save is a corrupt save.
    const { cookie, userId } = await createTestSession("liar@example.com");
    const key = `saves/${userId}/latest.db`;

    const lying = lyingBody(4096, 1024);
    const res = await SELF.fetch(
      // Merge the headers — a bare `headers: { cookie }` would REPLACE
      // lyingBody's content-length and silently turn this into the 411 case.
      req("/api/save", {
        ...lying,
        headers: { ...(lying.headers as Record<string, string>), cookie },
      })
    ).catch(() => null);

    if (res) expect([413, 500]).toContain(res.status);
    expect(await env.SAVES.head(key)).toBeNull();
  });

  it("a FAILED push does NOT destroy the previously stored save", async () => {
    // REGRESSION (merge-review blocker 1). putSave used to delete(key) in its
    // catch, on the theory that it was cleaning up a partial write. R2's put()
    // is atomic, so there is no partial write to clean up — the delete was
    // simply destroying the user's only cloud copy. Failure mode: a push over
    // a flaky network dies mid-stream and yesterday's good save is gone.
    const { cookie, userId } = await createTestSession("keepgood@example.com");
    const key = `saves/${userId}/latest.db`;
    const good = new Uint8Array(2048).fill(0x5a);

    const first = await SELF.fetch(
      req("/api/save", { method: "PUT", body: good, headers: { cookie, [VERSION]: "8" } })
    );
    expect(first.status).toBe(200);

    // Now a push that fails mid-stream (body overruns its declared length).
    const lying = lyingBody(4096, 1024);
    await SELF.fetch(
      req("/api/save", {
        ...lying,
        headers: { ...(lying.headers as Record<string, string>), cookie },
      })
    ).catch(() => null);

    // The good save must still be there, byte-identical, with its metadata.
    const head = await env.SAVES.head(key);
    expect(head, "previous good save was destroyed by a failed push").not.toBeNull();

    const get = await SELF.fetch(req("/api/save", { headers: { cookie } }));
    expect(get.status).toBe(200);
    expect(new Uint8Array(await get.arrayBuffer())).toEqual(good);
    expect(get.headers.get(VERSION)).toBe("8");
  });

  it("requires a Content-Length (411) rather than streaming an unknown size", async () => {
    const { cookie } = await createTestSession("nolen@example.com");
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array([1, 2, 3]));
        c.close();
      },
    });
    const res = await SELF.fetch(
      req("/api/save", {
        method: "PUT",
        body: stream,
        // @ts-expect-error — workerd streaming body
        duplex: "half",
        headers: { cookie },
      })
    );
    expect(res.status).toBe(411);
  });
});

describe("tenant isolation", () => {
  it("one user's save is never readable by another", async () => {
    const a = await createTestSession("a@example.com");
    const b = await createTestSession("b@example.com");

    await SELF.fetch(
      req("/api/save", {
        method: "PUT",
        body: new Uint8Array([0xaa]),
        headers: { cookie: a.cookie },
      })
    );

    // B has never uploaded: it must see its OWN (absent) key, not A's blob.
    const bGet = await SELF.fetch(req("/api/save", { headers: { cookie: b.cookie } }));
    expect(bGet.status).toBe(404);

    await SELF.fetch(
      req("/api/save", {
        method: "PUT",
        body: new Uint8Array([0xbb]),
        headers: { cookie: b.cookie },
      })
    );

    const aGet = await SELF.fetch(req("/api/save", { headers: { cookie: a.cookie } }));
    expect(new Uint8Array(await aGet.arrayBuffer())).toEqual(new Uint8Array([0xaa]));
    expect(await env.SAVES.head(`saves/${a.userId}/latest.db`)).not.toBeNull();
    expect(await env.SAVES.head(`saves/${b.userId}/latest.db`)).not.toBeNull();
  });
});
