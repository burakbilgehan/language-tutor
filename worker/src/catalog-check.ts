import type { CatalogCheckEntry } from "./catalog-data";

/**
 * T-058 core logic: which catalog ids look dead, given a live OpenRouter
 * `/models` listing. Pure — no fetch, no KV, no Worker globals — so it can be
 * unit-tested with a fixture id set and exercised once against the real
 * OpenRouter response without either depending on the other.
 *
 * Design constraint from the ticket: this NEVER auto-fixes or silently
 * ignores a dead/renamed id. It only reports. Curation stays human (Burak
 * reads the warning and edits the app catalog); this is the watchdog, not the
 * fix.
 */

export interface StaleWarning {
  /** The app catalog's model id that looks stale. */
  id: string;
  /** The OpenRouter id it was checked against. */
  checkedAs: string;
  reason: "not_found_on_openrouter";
}

export function checkCatalog(
  entries: CatalogCheckEntry[],
  openrouterIds: ReadonlySet<string>
): StaleWarning[] {
  const warnings: StaleWarning[] = [];
  for (const entry of entries) {
    if (entry.checkAs === null) continue; // not checkable, never flagged
    if (!openrouterIds.has(entry.checkAs)) {
      warnings.push({
        id: entry.id,
        checkedAs: entry.checkAs,
        reason: "not_found_on_openrouter",
      });
    }
  }
  return warnings;
}

/** Shape of the OpenRouter `GET /models` response we care about — public,
 * key-free (verified 2026-07-28: `curl https://openrouter.ai/api/v1/models`
 * returns `{"data":[{"id": "...", ...}, ...]}` with no auth header). */
export interface OpenRouterModelsResponse {
  data: Array<{ id: string }>;
}

export function extractOpenRouterIds(response: OpenRouterModelsResponse): Set<string> {
  return new Set(response.data.map((m) => m.id));
}
