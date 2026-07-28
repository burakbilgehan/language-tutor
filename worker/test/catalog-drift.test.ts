import { describe, expect, it } from "vitest";
import { CATALOG_CHECK_ENTRIES } from "../src/catalog-data";
import { CATALOG_PAYLOAD } from "../src/catalog-payload";

/**
 * T-058 drift guard, in-package half. Two files inside worker/src carry the
 * "same" model id list for different reasons (catalog-data.ts: what to check
 * against OpenRouter; catalog-payload.ts: what to serve to clients) and
 * nothing stops them diverging by hand-edit. This pins that they don't.
 *
 * What this does NOT catch: drift against the actual source of truth,
 * src/lib/llm/catalog.ts (app package, separate lockfile, no cross-package
 * import — same constraint documented in both worker files' headers). That
 * stays a manual sync step, called out in README "Deploy" / the T-058 report.
 */
describe("worker catalog copies stay in sync with each other", () => {
  it("catalog-payload.ts and catalog-data.ts list exactly the same model ids", () => {
    const payloadIds = new Set(CATALOG_PAYLOAD.models.map((m) => m.id));
    const checkIds = new Set(CATALOG_CHECK_ENTRIES.map((e) => e.id));
    expect([...payloadIds].sort()).toEqual([...checkIds].sort());
  });
});
