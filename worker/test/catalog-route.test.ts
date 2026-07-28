import { describe, expect, it } from "vitest";
import { SELF, env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { CATALOG_KV_KEY, runCronCheck } from "../src/catalog-cron";
import { CATALOG_PAYLOAD } from "../src/catalog-payload";
import worker from "../src/index";

const ORIGIN = "http://localhost:8787";

function req(pathname: string): Request {
  return new Request(`${ORIGIN}${pathname}`, { headers: { origin: ORIGIN } });
}

/** See catalog-cron.test.ts's testKv() for why the non-null assertion is
 * safe here: CATALOG_KV is optional on Env but always simulated in tests. */
function testKv(): KVNamespace {
  if (!env.CATALOG_KV) throw new Error("CATALOG_KV not bound in test env");
  return env.CATALOG_KV;
}

describe("GET /api/llm-catalog", () => {
  it("is reachable with no session (open route)", async () => {
    const res = await SELF.fetch(req("/api/llm-catalog"));
    expect(res.status).toBe(200);
  });

  it("serves the versioned catalog payload with empty staleWarnings when KV has never been written", async () => {
    await testKv().delete(CATALOG_KV_KEY);
    const res = await SELF.fetch(req("/api/llm-catalog"));
    const body = (await res.json()) as {
      version: number;
      models: unknown[];
      staleWarnings: unknown[];
      lastCheckedAt?: string;
    };
    expect(body.version).toBe(CATALOG_PAYLOAD.version);
    expect(body.models).toEqual(CATALOG_PAYLOAD.models);
    expect(body.staleWarnings).toEqual([]);
    expect(body.lastCheckedAt).toBeUndefined();
  });

  it("surfaces staleWarnings from a stored cron report", async () => {
    await testKv().delete(CATALOG_KV_KEY);
    const fakeFetch: typeof fetch = (async () =>
      new Response(
        JSON.stringify({
          data: Array.from({ length: 60 }, (_, i) => ({ id: `filler/model-${i}` })),
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )) as typeof fetch;
    // Every checkable app-catalog id is missing from this fake snapshot, so
    // every checkable entry gets flagged — proves the route surfaces exactly
    // what's in KV, not a re-derived or filtered subset.
    await runCronCheck(env, fakeFetch);

    const res = await SELF.fetch(req("/api/llm-catalog"));
    const body = (await res.json()) as { staleWarnings: unknown[]; lastCheckedAt?: string };
    expect(body.staleWarnings.length).toBeGreaterThan(0);
    expect(typeof body.lastCheckedAt).toBe("string");
  });

  it("sets a cache-control header (client relies on this for cheap re-fetch)", async () => {
    const res = await SELF.fetch(req("/api/llm-catalog"));
    expect(res.headers.get("cache-control")).toContain("max-age=3600");
  });

  it("is same-origin-only per the shared origin gate (untrusted origin still rejected)", async () => {
    const res = await SELF.fetch(
      new Request(`${ORIGIN}/api/llm-catalog`, { headers: { origin: "https://evil.example" } })
    );
    expect(res.status).toBe(403);
  });
});

describe("scheduled() cron handler — LIVE network, real OpenRouter (opt-in)", () => {
  // Unlike the rest of the suite, this one deliberately does NOT inject a
  // fake fetcher: `wrangler dev`/vitest-pool-workers' default miniflare
  // config permits real outbound fetch (verified empirically — an earlier
  // version of this test assumed egress was blocked and failed against a
  // genuine 200 from openrouter.ai; that discovery is recorded in the README).
  //
  // SKIPPED BY DEFAULT (env.T058_LIVE_CHECK, off unless vitest.config.ts's
  // binding is flipped to "1"). A real OpenRouter rename would fail this in
  // CI in a way that reads as "T-058 is broken" rather than "the catalog
  // needs curating" — the deterministic catalog-cron.test.ts suite already
  // covers every code path (success/failure/no-clobber) through fetch
  // injection, so this test adds no coverage, only a live proof run on
  // demand. The one-time proof for THIS session is recorded in the ticket
  // report instead: curl + a fixture snapshot of the real response,
  // 2026-07-28, all 8 checkable ids present.
  const live = env.T058_LIVE_CHECK === "1" ? it : it.skip;

  live("populates KV with a real report, which the route then reflects", async () => {
    await testKv().delete(CATALOG_KV_KEY);

    const ctx = createExecutionContext();
    await worker.scheduled!(
      { cron: "0 4 * * 1", scheduledTime: Date.now(), noRetry: () => {} } as ScheduledController,
      env,
      ctx
    );
    await waitOnExecutionContext(ctx);

    const raw = await testKv().get(CATALOG_KV_KEY);
    expect(raw, "cron should have written a report from a real, reachable OpenRouter").not.toBeNull();
    const stored = JSON.parse(raw!) as { checkedAt: string; warnings: unknown[] };
    expect(typeof stored.checkedAt).toBe("string");
    expect(Array.isArray(stored.warnings)).toBe(true);
    // Every id this ticket's catalog-data.ts marks checkAs was verified alive
    // against OpenRouter earlier in this session (2026-07-28) — a non-empty
    // result here would mean either a real rename (worth investigating) or a
    // bug in checkCatalog, not routine flakiness, so this is a meaningful
    // assertion rather than a coin flip.
    expect(stored.warnings).toEqual([]);

    const res = await SELF.fetch(req("/api/llm-catalog"));
    const body = (await res.json()) as { staleWarnings: unknown[]; lastCheckedAt?: string };
    expect(body.staleWarnings).toEqual([]);
    expect(typeof body.lastCheckedAt).toBe("string");
  });
});
