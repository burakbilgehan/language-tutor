import type { AuthInstance } from "./auth";
import type { Env } from "./env";

/**
 * The route table. This file is the COMPLETE inventory of the Worker's API
 * surface, and `test/auth-gate.test.ts` walks it to enforce that every mutating
 * route is authenticated.
 *
 * Why a table instead of `if (url.pathname === …)` branches in `fetch`:
 *
 * T-046 acceptance criterion 3 is "no state-changing route executes anything
 * before auth resolution" — the T-039 bug class. Discipline does not enforce
 * that; types do. An `authed` route's handler receives `AuthedCtx`, which
 * CONTAINS a resolved `session`. There is no way to invoke such a handler
 * without first having a session, so a body parse or an R2 write cannot
 * possibly precede auth resolution. T-047's save routes inherit the property by
 * construction simply by being added to this table.
 *
 * `src/index.ts` must NOT do its own path matching — that would be an escape
 * hatch around the table, and the gate test asserts it contains none.
 */

export interface BaseCtx {
  request: Request;
  env: Env;
  auth: AuthInstance;
  url: URL;
}

/** Exactly what `auth.api.getSession()` resolves to, minus the null. Derived
 * from better-auth's own types rather than hand-declared, so a library upgrade
 * that changes the session shape is a typecheck failure, not a runtime one. */
export type Session = NonNullable<
  Awaited<ReturnType<AuthInstance["api"]["getSession"]>>
>;

/** Context handed to an `auth: "required"` route. Note `session` is non-null. */
export interface AuthedCtx extends BaseCtx {
  session: Session;
}

export type Route =
  | {
      /** Exact pathname, or a prefix when `prefix: true`. */
      path: string;
      prefix?: boolean;
      methods: string[];
      auth: "required";
      handler: (ctx: AuthedCtx) => Promise<Response> | Response;
    }
  | {
      path: string;
      prefix?: boolean;
      methods: string[];
      auth: "open";
      /** Open handlers never receive a session — they must not need one. */
      handler: (ctx: BaseCtx) => Promise<Response> | Response;
    };

export const routes: Route[] = [
  {
    // better-auth owns everything under /api/auth/*: sign-in redirect, the
    // Google callback, get-session, sign-out.
    //
    // "open" is correct and not a gap: these endpoints EXIST to establish a
    // session, so requiring one would be circular. They are not unprotected —
    // better-auth runs its own origin/CSRF checks against `trustedOrigins`,
    // fed from the same parsed allowlist our dispatcher uses (src/origin.ts).
    // Our own strict origin gate is deliberately not applied here: the Google
    // callback is a cross-site top-level redirect from accounts.google.com and
    // an allowlist check would break it.
    path: "/api/auth/",
    prefix: true,
    methods: ["GET", "POST", "OPTIONS"],
    auth: "open",
    handler: ({ auth, request }) => auth.handler(request),
  },

  {
    // Cheap liveness probe. No DB read, no R2 touch, no user data, no
    // mutation — mirrors the Next app's `health/llm` allowlist entry.
    path: "/api/health",
    methods: ["GET"],
    auth: "open",
    handler: () => json({ ok: true }),
  },

  {
    // T-045's proof route; T-047 replaces its body with real save-sync
    // (seed-strip, versioning, schemaVersion metadata). Kept here so the
    // auth/tenant-scoping property is locked by tests before that lands.
    path: "/api/save",
    methods: ["GET", "PUT"],
    auth: "required",
    handler: async ({ request, env, session }) => {
      // Tenant scoping: the key is derived from the SESSION, never from client
      // input, so a user cannot address another user's object.
      const key = `saves/${session.user.id}/latest.db`;

      if (request.method === "PUT") {
        // Streamed straight to R2 — never buffered into memory. An unbounded
        // `await request.arrayBuffer()` here would be a 128 MB-limit hazard on
        // multi-MB saves.
        await env.SAVES.put(key, request.body, {
          customMetadata: { updatedAt: new Date().toISOString() },
        });
        return json({ ok: true, key });
      }

      const object = await env.SAVES.get(key);
      if (!object) return json({ error: "not_found", key }, 404);
      return new Response(object.body, {
        headers: {
          "content-type": "application/octet-stream",
          "x-lt-key": key,
          "x-lt-updated-at": object.customMetadata?.updatedAt ?? "",
        },
      });
    },
  },
];

export function matchRoute(url: URL, method: string): Route | "method_not_allowed" | null {
  let pathMatched = false;
  for (const route of routes) {
    const hit = route.prefix
      ? url.pathname.startsWith(route.path)
      : url.pathname === route.path;
    if (!hit) continue;
    pathMatched = true;
    // HEAD is served by the GET handler; the runtime strips the body.
    const effective = method === "HEAD" ? "GET" : method;
    if (route.methods.includes(effective)) return route;
  }
  return pathMatched ? "method_not_allowed" : null;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
