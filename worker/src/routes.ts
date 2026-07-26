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
    // T-047 save-sync. Manual push (PUT) / pull (GET) of the user's save blob.
    //
    // The backend is deliberately FORMAT-BLIND: it stores an opaque byte string
    // and an opaque version label. It never parses SQLite, never learns what
    // SAVE_SCHEMA_VERSION means, and never decides compatibility — the client
    // owns the save format, exactly as the ticket requires ("Backend save
    // formatını BİLMEZ, sadece saklar"). All the Worker does is refuse to hand
    // back a blob the client has already said it cannot read.
    path: "/api/save",
    methods: ["GET", "PUT"],
    auth: "required",
    handler: async ({ request, env, session }) => {
      // Tenant scoping: the key is derived from the SESSION, never from client
      // input, so a user cannot address another user's object.
      const key = `saves/${session.user.id}/latest.db`;

      if (request.method === "PUT") return putSave(request, env, key);
      return getSave(request, env, key);
    },
  },
];

/**
 * Upload cap. The app's own validator ceiling is 100 MB
 * (MAX_SAVE_BYTES, src/lib/save/limits.ts) — that one is a "this is not a save
 * file at all" bound for a LOCAL import. This is stricter on purpose: what
 * crosses the network is a SEED-STRIPPED blob, measured at ~8.6 MB on the
 * owner's real 19.5 MB database, and R2 storage here is the operator's cost,
 * not the user's disk. 30 MB leaves ~3x headroom for a much larger library
 * while keeping a hostile client from parking gigabytes per account.
 *
 * Not imported from src/lib/save/limits.ts: the Worker is a separate package
 * with its own lockfile and no path into the app's src/. Kept as a documented
 * local constant rather than a build-time coupling.
 */
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

/** Client-declared save-format version, stored opaquely alongside the blob.
 * Spelled again in src/lib/backup/cloud.ts (the client half) — the Worker is a
 * separate package with its own lockfile and no path into the app's src/, so
 * the two ends cannot share a constant. Change one, change the other. */
const VERSION_HEADER = "x-lt-schema-version";

async function putSave(request: Request, env: Env, key: string): Promise<Response> {
  // Reject on the DECLARED size before touching request.body, so an oversize
  // upload costs no R2 write and no streaming at all.
  const declared = request.headers.get("content-length");
  if (declared === null) {
    return json({ error: "length_required" }, 411);
  }
  const declaredBytes = Number(declared);
  if (!Number.isFinite(declaredBytes) || declaredBytes < 0) {
    return json({ error: "length_required" }, 411);
  }
  if (declaredBytes > MAX_UPLOAD_BYTES) {
    return json({ error: "too_large", max: MAX_UPLOAD_BYTES }, 413);
  }
  if (!request.body) {
    return json({ error: "empty_body" }, 400);
  }

  // Content-Length can lie, so the declared check above is not enough on its
  // own. We still stream (never `arrayBuffer()` a multi-MB save into memory),
  // but through a FixedLengthStream pinned to the DECLARED size.
  //
  // Why FixedLengthStream and not a bare TransformStream: R2's put() refuses a
  // stream of unknown length ("Provided readable stream must have a known
  // length"), and pipeThrough(new TransformStream()) erases the length. This
  // was caught by the suite, not reasoned about — a plain TransformStream made
  // every upload fail.
  //
  // It also enforces the cap for free, in the runtime rather than our code: a
  // body LONGER than the declared length errors the stream, and a SHORTER one
  // fails to fulfil it. So a client that understates its size to slip past the
  // 413 cannot then send more bytes than it declared.
  const fixed = new FixedLengthStream(declaredBytes);
  const version = request.headers.get(VERSION_HEADER) ?? "";
  const updatedAt = new Date().toISOString();

  // Pump the body into the fixed-length stream. Not awaited before put(): R2
  // consumes the readable half as we write to the writable half.
  //
  // The `.catch()` is required, not decorative. When the client overruns its
  // declared length, this promise rejects ("Attempt to write too many bytes
  // through a FixedLengthStream") — and an un-caught rejection here surfaces as
  // an unhandled rejection that can fail the whole run. The rejection is
  // EXPECTED on that path; put() below rejects too, and that is the one we act
  // on. Captured so the outcome is still inspectable rather than swallowed.
  let pumpError: unknown = null;
  const pump = request.body.pipeTo(fixed.writable).catch((err: unknown) => {
    pumpError = err;
  });

  try {
    await env.SAVES.put(key, fixed.readable, {
      customMetadata: {
        updatedAt,
        // Opaque to us. Echoed back on GET so a client can refuse a blob its
        // own importer would reject.
        schemaVersion: version,
      },
    });
    await pump;
    if (pumpError) throw pumpError;
  } catch {
    // A length mismatch (lying client) or a broken upload can leave a partial
    // or empty object behind; a corrupt save is worse than no save.
    await env.SAVES.delete(key).catch(() => {});
    return json({ error: "too_large", max: MAX_UPLOAD_BYTES }, 413);
  }

  return json({
    ok: true,
    key,
    updatedAt,
    schemaVersion: version,
    bytes: declaredBytes,
  });
}

async function getSave(request: Request, env: Env, key: string): Promise<Response> {
  // head() first: it reads metadata WITHOUT the body, so a version-incompatible
  // pull costs no egress and, more importantly, the refusal happens before the
  // client can start writing bytes over its local database.
  const meta = await env.SAVES.head(key);
  if (!meta) return json({ error: "not_found", key }, 404);

  const stored = meta.customMetadata?.schemaVersion ?? "";
  const updatedAt = meta.customMetadata?.updatedAt ?? "";

  // Compatibility is the CLIENT's rule; we only enforce the one it states. When
  // the caller declares the version it can read and the stored blob differs, we
  // refuse rather than serve bytes that would fail (or worse, half-succeed) on
  // import. A caller that sends no header gets the blob and does its own check
  // — src/lib/backup/save-image.ts validateSaveImage refuses on mismatch too,
  // so this is defence in depth, not the only gate.
  const wanted = request.headers.get(VERSION_HEADER);
  if (wanted !== null && stored !== "" && wanted !== stored) {
    return json(
      { error: "save_version_mismatch", stored, expected: wanted, updatedAt },
      409
    );
  }

  // HEAD ("what is in the cloud?") must not read the object. matchRoute maps
  // HEAD onto the GET handler and the runtime drops the body — but R2 would
  // already have served every byte, so a metadata check would cost a full
  // multi-MB egress. head() above is all this needs.
  if (request.method === "HEAD") {
    return new Response(null, {
      headers: {
        "content-type": "application/octet-stream",
        "content-length": String(meta.size),
        "x-lt-key": key,
        "x-lt-updated-at": updatedAt,
        [VERSION_HEADER]: stored,
      },
    });
  }

  const object = await env.SAVES.get(key);
  if (!object) return json({ error: "not_found", key }, 404);

  return new Response(object.body, {
    headers: {
      "content-type": "application/octet-stream",
      "content-length": String(object.size),
      "x-lt-key": key,
      "x-lt-updated-at": updatedAt,
      [VERSION_HEADER]: stored,
    },
  });
}

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
