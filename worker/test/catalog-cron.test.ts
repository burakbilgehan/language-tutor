import { describe, expect, it } from "vitest";
import { env } from "cloudflare:test";
import {
  CATALOG_KV_KEY,
  fetchAndCheckCatalog,
  runCronCheck,
  readStoredReport,
} from "../src/catalog-cron";

/**
 * T-058 cron/KV wiring. Network is faked via an injected `fetcher` (see
 * catalog-cron.ts) — no real HTTP in this suite, matching the rest of the
 * worker suite's "no live network" posture. The one live-OpenRouter proof
 * required by the ticket is a manual run, documented in README, not here.
 */

/** CATALOG_KV is declared optional on `Env` (see env.ts — a fresh deploy or
 * an unconfigured local dev must not require it), but vitest.config.ts's
 * miniflare simulates every binding declared in wrangler.jsonc, so it is
 * always present in this test env. Narrows the type once per call site
 * instead of asserting `!` everywhere below. */
function testKv(): KVNamespace {
  if (!env.CATALOG_KV) throw new Error("CATALOG_KV not bound in test env");
  return env.CATALOG_KV;
}

function fakeResponse(body: unknown, status = 200): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;
}

/** A realistic-sized snapshot (>=50 entries, the suspicious-shortness floor)
 * containing every id the app catalog currently marks checkAs, so a normal
 * run produces zero warnings. */
function healthySnapshot() {
  const known = [
    "anthropic/claude-haiku-4.5",
    "anthropic/claude-sonnet-5",
    "anthropic/claude-opus-5",
    "deepseek/deepseek-v3.2",
    "deepseek/deepseek-r1-0528",
    "openai/gpt-5.4-nano",
    "openai/gpt-5.4-mini",
    "openai/gpt-5.4",
  ];
  const filler = Array.from({ length: 50 }, (_, i) => `filler/model-${i}`);
  return { data: [...known, ...filler].map((id) => ({ id })) };
}

describe("fetchAndCheckCatalog", () => {
  it("a clean OpenRouter snapshot with every checkable id present yields zero warnings", async () => {
    const report = await fetchAndCheckCatalog(fakeResponse(healthySnapshot()));
    expect(report.fetchError).toBeUndefined();
    expect(report.warnings).toEqual([]);
  });

  it("a snapshot missing one OpenRouter id flags EVERY app-catalog entry checked against it (two here: the Anthropic-native id and the OpenRouter slug both map to anthropic/claude-opus-5)", async () => {
    // Deliberately not deduped on checkedAs: catalog.ts has two distinct
    // entries (claude-opus-5 native, anthropic/claude-opus-5 OpenRouter slug)
    // that both need editing if the underlying model dies, so both must
    // surface as separate warnings — collapsing them would hide half the
    // curation work from whoever reads staleWarnings.
    const snapshot = healthySnapshot();
    snapshot.data = snapshot.data.filter((m) => m.id !== "anthropic/claude-opus-5");
    const report = await fetchAndCheckCatalog(fakeResponse(snapshot));
    expect(report.fetchError).toBeUndefined();
    expect(report.warnings).toEqual([
      {
        id: "claude-opus-5",
        checkedAs: "anthropic/claude-opus-5",
        reason: "not_found_on_openrouter",
      },
      {
        id: "anthropic/claude-opus-5",
        checkedAs: "anthropic/claude-opus-5",
        reason: "not_found_on_openrouter",
      },
    ]);
  });

  it("network failure reports fetchError and no warnings", async () => {
    const throwing: typeof fetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as typeof fetch;
    const report = await fetchAndCheckCatalog(throwing);
    expect(report.fetchError).toMatch(/^network:/);
    expect(report.warnings).toEqual([]);
  });

  it("non-200 response reports fetchError", async () => {
    const report = await fetchAndCheckCatalog(fakeResponse({}, 503));
    expect(report.fetchError).toBe("http_503");
  });

  it("malformed JSON body reports fetchError", async () => {
    const badJson: typeof fetch = (async () =>
      new Response("not json{", { status: 200 })) as typeof fetch;
    const report = await fetchAndCheckCatalog(badJson);
    expect(report.fetchError).toMatch(/^bad_json:/);
  });

  it("unexpected shape (no data array) reports fetchError", async () => {
    const report = await fetchAndCheckCatalog(fakeResponse({ nope: true }));
    expect(report.fetchError).toBe("unexpected_shape");
  });

  it("suspiciously short list (fewer than 50 models) reports fetchError instead of mass-flagging everything", async () => {
    const report = await fetchAndCheckCatalog(
      fakeResponse({ data: [{ id: "anthropic/claude-sonnet-5" }] })
    );
    expect(report.fetchError).toMatch(/^suspiciously_short_list:1$/);
    expect(report.warnings).toEqual([]);
  });
});

describe("runCronCheck — KV write semantics", () => {
  it("a successful check writes the report to KV", async () => {
    await testKv().delete(CATALOG_KV_KEY);
    await runCronCheck(env, fakeResponse(healthySnapshot()));
    const stored = await readStoredReport(env);
    expect(stored).not.toBeNull();
    expect(stored!.warnings).toEqual([]);
  });

  it("a failed fetch does NOT overwrite a previously stored good report", async () => {
    await testKv().delete(CATALOG_KV_KEY);
    await runCronCheck(env, fakeResponse(healthySnapshot()));
    const before = await readStoredReport(env);
    expect(before).not.toBeNull();

    const throwing: typeof fetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as typeof fetch;
    await runCronCheck(env, throwing);

    const after = await readStoredReport(env);
    expect(after).toEqual(before);
  });

  it("a failed fetch with NO previous report leaves KV empty (readStoredReport returns null, not a synthesized failure report)", async () => {
    await testKv().delete(CATALOG_KV_KEY);
    const throwing: typeof fetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as typeof fetch;
    await runCronCheck(env, throwing);
    expect(await readStoredReport(env)).toBeNull();
  });

  it("a suspiciously-short list does not overwrite a good previous report either", async () => {
    await testKv().delete(CATALOG_KV_KEY);
    await runCronCheck(env, fakeResponse(healthySnapshot()));
    const before = await readStoredReport(env);

    await runCronCheck(env, fakeResponse({ data: [{ id: "x" }] }));
    const after = await readStoredReport(env);
    expect(after).toEqual(before);
  });
});

describe("readStoredReport", () => {
  it("returns null when KV has never been written", async () => {
    await testKv().delete(CATALOG_KV_KEY);
    expect(await readStoredReport(env)).toBeNull();
  });

  it("returns null (not a throw) on corrupt KV content", async () => {
    await testKv().put(CATALOG_KV_KEY, "not json{");
    expect(await readStoredReport(env)).toBeNull();
  });

  it("returns null on a structurally wrong but valid JSON payload", async () => {
    await testKv().put(CATALOG_KV_KEY, JSON.stringify({ foo: "bar" }));
    expect(await readStoredReport(env)).toBeNull();
  });
});
