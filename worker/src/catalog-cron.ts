import { CATALOG_CHECK_ENTRIES } from "./catalog-data";
import { checkCatalog, extractOpenRouterIds, type StaleWarning } from "./catalog-check";
import type { Env } from "./env";

/** KV key the weekly cron writes to and the route reads from. Exported so
 * both sides (and tests) spell it once. */
export const CATALOG_KV_KEY = "catalog-check:latest";

export interface CatalogCheckReport {
  checkedAt: string;
  warnings: StaleWarning[];
  /** Present only when the OpenRouter fetch itself failed — the PREVIOUS
   * report (if any) is kept in that case, this field is not persisted, it is
   * only surfaced transiently to the caller of runCatalogCheck for logging. */
  fetchError?: string;
}

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

/**
 * Fetches OpenRouter's public model list and checks the catalog against it.
 * Returns `{ fetchError }` (no warnings) on any network/parse failure —
 * callers MUST NOT overwrite a good previous KV report with a failed run,
 * because that would mean one transient blip reports "everything is dead" to
 * every client reading `/api/llm-catalog`. See `runCronCheck` below, which is
 * the one place that enforces this.
 *
 * `fetcher` defaults to the real global `fetch` and is only ever overridden
 * by tests — vitest-pool-workers runs inside real workerd, where hitting the
 * actual internet from the test suite would be slow, flaky, and (per the
 * T-058 brief) explicitly NOT where the live-OpenRouter proof belongs; that
 * proof is a one-off manual run instead, see README.
 */
export async function fetchAndCheckCatalog(
  fetcher: typeof fetch = fetch
): Promise<CatalogCheckReport> {
  const checkedAt = new Date().toISOString();
  let res: Response;
  try {
    res = await fetcher(OPENROUTER_MODELS_URL, {
      headers: { accept: "application/json" },
    });
  } catch (err) {
    return { checkedAt, warnings: [], fetchError: `network: ${String(err)}` };
  }
  if (!res.ok) {
    return { checkedAt, warnings: [], fetchError: `http_${res.status}` };
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch (err) {
    return { checkedAt, warnings: [], fetchError: `bad_json: ${String(err)}` };
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !Array.isArray((body as { data?: unknown }).data)
  ) {
    return { checkedAt, warnings: [], fetchError: "unexpected_shape" };
  }
  // A suspiciously small list is also treated as a failed fetch — OpenRouter
  // has consistently listed 300+ models (340 measured 2026-07-28); a payload
  // that parses but is nearly empty is far more likely a truncated/broken
  // response than every checkable id having vanished at once.
  const data = (body as { data: Array<{ id: string }> }).data;
  if (data.length < 50) {
    return { checkedAt, warnings: [], fetchError: `suspiciously_short_list:${data.length}` };
  }

  const ids = extractOpenRouterIds({ data });
  const warnings = checkCatalog(CATALOG_CHECK_ENTRIES, ids);
  return { checkedAt, warnings };
}

/**
 * The cron entry point. Runs the check and writes to KV — but ONLY on a
 * successful fetch. A `fetchError` leaves the previously stored report
 * (possibly none) untouched, so a network blip can never overwrite a good
 * "no warnings" report with a false "everything failed" one, and can never
 * synthesize false stale-warnings from an empty/garbage id set.
 *
 * No-ops (does not throw) when CATALOG_KV isn't bound — mirrors the route's
 * "optional binding, degrade quietly" posture rather than failing the cron.
 */
export async function runCronCheck(
  env: Env,
  fetcher: typeof fetch = fetch
): Promise<CatalogCheckReport> {
  const report = await fetchAndCheckCatalog(fetcher);
  if (report.fetchError) {
    return report;
  }
  if (env.CATALOG_KV) {
    const stored: CatalogCheckReport = { checkedAt: report.checkedAt, warnings: report.warnings };
    await env.CATALOG_KV.put(CATALOG_KV_KEY, JSON.stringify(stored));
  }
  return report;
}

/** Reads the last stored report for the route handler. Returns null (never
 * throws) when unbound or empty/corrupt — the route treats null as "no
 * warnings yet", not as an error. */
export async function readStoredReport(
  env: Env
): Promise<Pick<CatalogCheckReport, "checkedAt" | "warnings"> | null> {
  if (!env.CATALOG_KV) return null;
  const raw = await env.CATALOG_KV.get(CATALOG_KV_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Pick<CatalogCheckReport, "checkedAt" | "warnings">;
    if (typeof parsed.checkedAt !== "string" || !Array.isArray(parsed.warnings)) return null;
    return parsed;
  } catch {
    return null;
  }
}
