import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { authEnabled, isAuthed, requireAuth, tokenMatches } from "./auth";

// ---------------------------------------------------------------- helpers

/** Run fn with APP_AUTH_TOKEN set to `value`, then restore. Async-aware: it
 * awaits fn before restoring, so assertions after an `await` inside fn still
 * see the intended env (a sync-only version would restore at the first await). */
async function withToken<T>(
  value: string | undefined,
  fn: () => T | Promise<T>
): Promise<T> {
  const prev = process.env.APP_AUTH_TOKEN;
  if (value === undefined) delete process.env.APP_AUTH_TOKEN;
  else process.env.APP_AUTH_TOKEN = value;
  try {
    return await fn();
  } finally {
    if (prev === undefined) delete process.env.APP_AUTH_TOKEN;
    else process.env.APP_AUTH_TOKEN = prev;
  }
}

const req = (headers: Record<string, string> = {}) =>
  new Request("http://localhost:3000/api/save/export", { headers });

// ------------------------------------------------- gate OFF = strict no-op

test("gate off: unset token is a complete no-op", async () => {
  await withToken(undefined, () => {
    assert.equal(authEnabled(), false);
    assert.equal(isAuthed(req()), true);
    assert.equal(requireAuth(req()), null);
    // A bogus/hostile Authorization header must not flip anything either.
    assert.equal(requireAuth(req({ authorization: "Bearer nope" })), null);
    assert.equal(requireAuth(req({ cookie: "lt_auth=nope" })), null);
  });
});

test("gate off: empty / whitespace-only APP_AUTH_TOKEN stays off", async () => {
  for (const v of ["", "   ", "\t\n"]) {
    await withToken(v, () => {
      assert.equal(authEnabled(), false, `value ${JSON.stringify(v)}`);
      assert.equal(requireAuth(req()), null);
    });
  }
});

// -------------------------------------------------------------- gate ON

test("gate on: no credential → 401 with a stable error code", async () => {
  await withToken("s3cret", async () => {
    assert.equal(authEnabled(), true);
    const res = requireAuth(req());
    assert.ok(res, "expected a denial response");
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error, "unauthorized");
  });
});

test("gate on: bearer header", async () => {
  await withToken("s3cret", () => {
    assert.equal(requireAuth(req({ authorization: "Bearer s3cret" })), null);
    assert.equal(requireAuth(req({ authorization: "bearer s3cret" })), null);
    assert.ok(requireAuth(req({ authorization: "Bearer wrong" })));
    assert.ok(requireAuth(req({ authorization: "s3cret" })));
  });
});

test("gate on: cookie", async () => {
  await withToken("s3cret", () => {
    assert.equal(requireAuth(req({ cookie: "lt_auth=s3cret" })), null);
    // Coexisting with other cookies, in any position.
    assert.equal(
      requireAuth(req({ cookie: "theme=dark; lt_auth=s3cret; x=1" })),
      null
    );
    assert.ok(requireAuth(req({ cookie: "lt_auth=wrong" })));
    assert.ok(requireAuth(req({ cookie: "other=s3cret" })));
  });
});

test("gate on: wrong token is a clean 401, never a throw", async () => {
  await withToken("s3cret", () => {
    // Different length used to make timingSafeEqual throw — must not.
    for (const bad of ["", "x", "s3cre", "s3crets3cret", "S3CRET"]) {
      assert.ok(requireAuth(req({ authorization: `Bearer ${bad}` })), bad);
    }
  });
});

test("tokenMatches: exact, whole-value comparison", async () => {
  await withToken("s3cret", () => {
    assert.equal(tokenMatches("s3cret"), true);
    assert.equal(tokenMatches(" s3cret"), false);
    assert.equal(tokenMatches(null), false);
    assert.equal(tokenMatches(undefined), false);
  });
});

// ------------------------------------------------ route inventory invariant
//
// The gate is only as good as its coverage. Hand-sweeping 37 route files is a
// one-time act; this test makes it a checked property, so a NEW route added
// later fails the suite unless it is either gated or consciously allowlisted.

/** Method-level allowlist: routes deliberately reachable without a token.
 * Add here ONLY with a justification comment. */
const OPEN_ROUTES: Record<string, string> = {
  // Availability probe for client UI gating. No DB read, no LLM call, no
  // mutation — returns three booleans about LLM configuration. Kept open so
  // the app shell renders something coherent before the operator authenticates.
  "health/llm#GET": "cheap boolean probe, no data",
  // Vendored stroke-order dataset (animCJK) served from node_modules. Public
  // static reference data, identical for every user, no profile involved.
  "strokes/[char]#GET": "static public dataset",
  // The gate's own cookie bootstrap — validates the token itself.
  "auth#GET": "token bootstrap",
  "auth#DELETE": "cookie clear",
};

function routeFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) routeFiles(full, out);
    else if (entry === "route.ts") out.push(full);
  }
  return out;
}

test("every API route method is gated or explicitly allowlisted", () => {
  const apiDir = path.join(process.cwd(), "src", "app", "api");
  const files = routeFiles(apiDir);
  assert.ok(files.length > 20, `expected many routes, found ${files.length}`);

  const ungated: string[] = [];
  const staleAllowlist = new Set(Object.keys(OPEN_ROUTES));

  for (const file of files) {
    const rel = path
      .relative(apiDir, file)
      .replace(/\/route\.ts$/, "")
      .replace(/\\/g, "/");
    const src = readFileSync(file, "utf8");
    const methods = [...src.matchAll(/export (?:async )?function (GET|POST|PUT|PATCH|DELETE)\(/g)];
    for (const [, method] of methods) {
      const key = `${rel}#${method}`;
      if (key in OPEN_ROUTES) {
        staleAllowlist.delete(key);
        continue;
      }
      // The handler body must call requireAuth. Cheap textual check: the file
      // imports it and the handler's first statements invoke it.
      const body = src.slice(src.indexOf(`function ${method}(`));
      const nextExport = body.indexOf("\nexport ", 1);
      const scoped = nextExport > 0 ? body.slice(0, nextExport) : body;
      if (!scoped.includes("requireAuth(")) ungated.push(key);
    }
  }

  assert.deepEqual(
    ungated,
    [],
    `ungated route methods (add requireAuth or allowlist in auth.test.ts): ${ungated.join(", ")}`
  );
  assert.deepEqual(
    [...staleAllowlist],
    [],
    `OPEN_ROUTES entries no longer matching any route: ${[...staleAllowlist].join(", ")}`
  );
});
