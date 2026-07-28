import test from "node:test";
import assert from "node:assert/strict";
import {
  refreshCatalogFromWorker,
  getCatalogOverlayWarnings,
  _resetCatalogOverlayForTests,
} from "./catalog-refresh";
import { MODEL_REGISTRY, describeModel } from "./catalog";

// T-058: the client overlay must be transparent to every existing
// catalog.ts consumer (config.ts, provider.ts, browser-provider.ts,
// presets.ts) and NEVER let a failed/blocked/malformed fetch change
// observable behaviour. These tests run in plain Node (no jsdom) — there is
// no `window` global by default, which is exactly the environment this
// module must degrade correctly in, and also lets tests add/remove a fake
// `window` to control the browser-only guard precisely.

function withFakeWindow<T>(fn: () => T): T {
  const g = globalThis as { window?: unknown };
  const had = "window" in g;
  const prev = g.window;
  g.window = {};
  try {
    return fn();
  } finally {
    if (had) g.window = prev;
    else delete g.window;
  }
}

function withFetch<T>(impl: typeof fetch, fn: () => Promise<T>): Promise<T> {
  const g = globalThis as { fetch?: typeof fetch };
  const prev = g.fetch;
  g.fetch = impl;
  return fn().finally(() => {
    g.fetch = prev;
  });
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

const VALID_PAYLOAD = {
  version: 1,
  publishedAt: "2026-07-28T00:00:00.000Z",
  models: [
    { id: "claude-sonnet-5", label: "Claude Sonnet 5 (patched)", priceInPerMtok: 3, priceOutPerMtok: 11 },
  ],
  staleWarnings: [],
};

test("refreshCatalogFromWorker: no `window` (SSR/build/Node) resolves null and never calls fetch", async () => {
  _resetCatalogOverlayForTests();
  let called = false;
  await withFetch(
    (async () => {
      called = true;
      throw new Error("should never be invoked without window");
    }) as typeof fetch,
    async () => {
      const result = await refreshCatalogFromWorker();
      assert.equal(result, null);
    }
  );
  assert.equal(called, false);
});

test("refreshCatalogFromWorker: fetch network failure resolves null, MODEL_REGISTRY unchanged", async () => {
  _resetCatalogOverlayForTests();
  const before = { ...describeModel("claude-sonnet-5") };
  await withFakeWindow(() =>
    withFetch(
      (async () => {
        throw new Error("ECONNREFUSED");
      }) as typeof fetch,
      async () => {
        const result = await refreshCatalogFromWorker();
        assert.equal(result, null);
      }
    )
  );
  assert.deepEqual(describeModel("claude-sonnet-5"), before);
});

test("refreshCatalogFromWorker: non-ok response (e.g. server-mode 404) resolves null, no throw", async () => {
  _resetCatalogOverlayForTests();
  await withFakeWindow(() =>
    withFetch(
      (async () => jsonResponse("<html>not found</html>", false, 404)) as typeof fetch,
      async () => {
        const result = await refreshCatalogFromWorker();
        assert.equal(result, null);
      }
    )
  );
});

test("refreshCatalogFromWorker: malformed/unexpected shape resolves null, applies nothing", async () => {
  _resetCatalogOverlayForTests();
  const before = { ...describeModel("claude-sonnet-5") };
  await withFakeWindow(() =>
    withFetch(
      (async () => jsonResponse({ totally: "wrong shape" })) as typeof fetch,
      async () => {
        const result = await refreshCatalogFromWorker();
        assert.equal(result, null);
      }
    )
  );
  assert.deepEqual(describeModel("claude-sonnet-5"), before);
});

test("refreshCatalogFromWorker: a valid payload patches the matching MODEL_REGISTRY entry in place", async () => {
  _resetCatalogOverlayForTests();
  try {
    await withFakeWindow(() =>
      withFetch(
        (async () => jsonResponse(VALID_PAYLOAD)) as typeof fetch,
        async () => {
          const result = await refreshCatalogFromWorker();
          assert.ok(result);
        }
      )
    );
    const patched = describeModel("claude-sonnet-5");
    assert.equal(patched.label, "Claude Sonnet 5 (patched)");
    assert.equal(patched.priceInPerMtok, 3);
    assert.equal(patched.priceOutPerMtok, 11);
  } finally {
    // Restore MODEL_REGISTRY so this test doesn't leak state into other
    // files run in the same process (tsx --test runs each file separately,
    // but keep this defensive since MODEL_REGISTRY is a shared module-level
    // object).
    MODEL_REGISTRY["claude-sonnet-5"].label = "Claude Sonnet 5";
    MODEL_REGISTRY["claude-sonnet-5"].priceInPerMtok = 2;
    MODEL_REGISTRY["claude-sonnet-5"].priceOutPerMtok = 10;
  }
});

test("refreshCatalogFromWorker: an id in the payload that is NOT in MODEL_REGISTRY is skipped, never inserted", async () => {
  _resetCatalogOverlayForTests();
  const payload = {
    ...VALID_PAYLOAD,
    models: [
      ...VALID_PAYLOAD.models,
      { id: "brand-new-model-id", label: "New", priceInPerMtok: 1, priceOutPerMtok: 1 },
    ],
  };
  await withFakeWindow(() =>
    withFetch((async () => jsonResponse(payload)) as typeof fetch, async () => {
      await refreshCatalogFromWorker();
    })
  );
  assert.equal("brand-new-model-id" in MODEL_REGISTRY, false);
  // cleanup
  MODEL_REGISTRY["claude-sonnet-5"].label = "Claude Sonnet 5";
  MODEL_REGISTRY["claude-sonnet-5"].priceInPerMtok = 2;
  MODEL_REGISTRY["claude-sonnet-5"].priceOutPerMtok = 10;
});

test("refreshCatalogFromWorker: does not add PROVIDER entries — CATALOG's provider id set is untouched by the overlay", async () => {
  _resetCatalogOverlayForTests();
  const { CATALOG } = await import("./catalog");
  const providersBefore = Object.keys(CATALOG).sort();
  await withFakeWindow(() =>
    withFetch((async () => jsonResponse(VALID_PAYLOAD)) as typeof fetch, async () => {
      await refreshCatalogFromWorker();
    })
  );
  assert.deepEqual(Object.keys(CATALOG).sort(), providersBefore);
  // cleanup
  MODEL_REGISTRY["claude-sonnet-5"].label = "Claude Sonnet 5";
  MODEL_REGISTRY["claude-sonnet-5"].priceInPerMtok = 2;
  MODEL_REGISTRY["claude-sonnet-5"].priceOutPerMtok = 10;
});

test("getCatalogOverlayWarnings: empty before any successful fetch", () => {
  _resetCatalogOverlayForTests();
  assert.deepEqual(getCatalogOverlayWarnings(), []);
});

test("getCatalogOverlayWarnings: reflects the last successful payload's staleWarnings", async () => {
  _resetCatalogOverlayForTests();
  const payload = {
    ...VALID_PAYLOAD,
    staleWarnings: [
      { id: "claude-opus-5", checkedAs: "anthropic/claude-opus-5", reason: "not_found_on_openrouter" as const },
    ],
    lastCheckedAt: "2026-07-28T04:00:00.000Z",
  };
  await withFakeWindow(() =>
    withFetch((async () => jsonResponse(payload)) as typeof fetch, async () => {
      await refreshCatalogFromWorker();
    })
  );
  assert.deepEqual(getCatalogOverlayWarnings(), payload.staleWarnings);
  // cleanup
  MODEL_REGISTRY["claude-sonnet-5"].label = "Claude Sonnet 5";
  MODEL_REGISTRY["claude-sonnet-5"].priceInPerMtok = 2;
  MODEL_REGISTRY["claude-sonnet-5"].priceOutPerMtok = 10;
});

test("refreshCatalogFromWorker: a second call after a resolved attempt reuses the cached result, does not re-fetch", async () => {
  _resetCatalogOverlayForTests();
  let calls = 0;
  await withFakeWindow(async () => {
    await withFetch(
      (async () => {
        calls++;
        return jsonResponse(VALID_PAYLOAD);
      }) as typeof fetch,
      async () => {
        await refreshCatalogFromWorker();
        await refreshCatalogFromWorker();
        await refreshCatalogFromWorker();
      }
    );
  });
  assert.equal(calls, 1);
  // cleanup
  MODEL_REGISTRY["claude-sonnet-5"].label = "Claude Sonnet 5";
  MODEL_REGISTRY["claude-sonnet-5"].priceInPerMtok = 2;
  MODEL_REGISTRY["claude-sonnet-5"].priceOutPerMtok = 10;
});
