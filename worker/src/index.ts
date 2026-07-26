import { getAuth } from "./auth";
import type { Env } from "./env";

/**
 * T-045 spike entry point.
 *
 * Proves the load-bearing chain end to end: better-auth on the Workers
 * runtime -> session persisted in D1 -> authenticated request -> per-user
 * R2 read/write. Not production code; T-046 hardens it.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const auth = getAuth(env);

    // better-auth owns everything under /api/auth/*.
    if (url.pathname.startsWith("/api/auth/")) {
      return auth.handler(request);
    }

    if (url.pathname === "/api/save") {
      // Auth resolution is the FIRST thing that happens — no body parse, no
      // R2 touch before we know who is calling. This is the T-039/T-046
      // "handler ran before auth" bug class, avoided by construction.
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        return json({ error: "unauthorized" }, 401);
      }

      // Tenant scoping: the key is derived from the session, never from
      // client input, so a user cannot address another user's object.
      const key = `saves/${session.user.id}/latest.db`;

      if (request.method === "PUT") {
        await env.SAVES.put(key, request.body, {
          customMetadata: { updatedAt: new Date().toISOString() },
        });
        return json({ ok: true, key });
      }

      if (request.method === "GET") {
        const object = await env.SAVES.get(key);
        if (!object) return json({ error: "not_found", key }, 404);
        return new Response(object.body, {
          headers: {
            "content-type": "application/octet-stream",
            "x-lt-key": key,
            "x-lt-updated-at": object.customMetadata?.updatedAt ?? "",
          },
        });
      }

      return json({ error: "method_not_allowed" }, 405);
    }

    if (url.pathname === "/api/health") {
      return json({ ok: true });
    }

    return json({ error: "not_found" }, 404);
  },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
