// T-058: runtime overlay on top of the build-embedded model catalog.
//
// The embedded catalog (catalog.ts, MODEL_REGISTRY/CATALOG) is ALWAYS the
// working fallback — every export catalog.ts already has keeps working
// byte-for-byte if this module never runs, is blocked, or fails. This module
// only ever ADDS a same-origin runtime fetch of the Worker's
// `GET /api/llm-catalog` (worker/src/routes.ts) and, if it succeeds and
// validates, patches labels/prices onto EXISTING MODEL_REGISTRY entries in
// place.
//
// Deliberately narrow overlay surface, by design (not a limitation to work
// around): this patches CatalogModel fields (label/priceIn/priceOut) on ids
// that already exist in MODEL_REGISTRY. It does NOT add new provider ids,
// does NOT touch ProviderCatalogEntry.profiles/defaultModels (those hold id
// STRINGS, resolveModelId()/CATALOG_LIST/providerForBaseUrl are therefore
// untouched by construction), and does NOT patch `presets.ts`'s PRESETS
// (that module copies label/baseUrl/jsonMode/models/needsKey by VALUE at
// module-init time from CATALOG — none of which this overlay writes, so
// there is no value-copy gap to route around for this scope). A UI surface
// for `staleWarnings` (e.g. in LlmSetupWizard's advanced panel) is NOT part
// of this module — see getCatalogOverlayWarnings() below and the T-058
// report for why that's flagged as a follow-up rather than built here.
//
// Consumers of catalog.ts's synchronous exports (config.ts, provider.ts,
// browser-provider.ts, presets.ts) are UNCHANGED — none of them import from
// this file, and none of them need to: they call describeModel()/CATALOG
// AFTER whatever mutation has already landed, same as they always have.
//
// Browser-only, lazy, and best-effort. Never imported eagerly by anything
// that could run at Next.js prerender/build time — this file is opt-in, a
// caller must explicitly call refreshCatalogFromWorker().

import { z } from "zod";
import { MODEL_REGISTRY } from "./catalog";

const CatalogModelPatchSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  priceInPerMtok: z.number().finite().nonnegative(),
  priceOutPerMtok: z.number().finite().nonnegative(),
});

const StaleWarningSchema = z.object({
  id: z.string(),
  checkedAs: z.string(),
  reason: z.literal("not_found_on_openrouter"),
});

const CatalogPayloadSchema = z.object({
  version: z.number().int().nonnegative(),
  publishedAt: z.string(),
  models: z.array(CatalogModelPatchSchema),
  staleWarnings: z.array(StaleWarningSchema),
  lastCheckedAt: z.string().optional(),
});

export type CatalogPayload = z.infer<typeof CatalogPayloadSchema>;

let lastResult: CatalogPayload | null = null;
let attempted = false;
let inFlight: Promise<CatalogPayload | null> | null = null;

/**
 * Fetches the Worker's versioned catalog overlay and patches MODEL_REGISTRY
 * entries in place. Safe to call multiple times (subsequent calls reuse the
 * in-flight promise, then the cached result — no unbounded re-fetching from
 * multiple call sites).
 *
 * Returns the validated payload on success, or null on ANY failure
 * (network error, non-2xx, malformed JSON, schema mismatch) — callers must
 * treat null as "nothing changed, embedded catalog stands", never as an
 * error to surface to the user. This function itself never throws.
 */
export function refreshCatalogFromWorker(): Promise<CatalogPayload | null> {
  // Browser-only: a relative-URL fetch() evaluated during `next build`
  // prerender (no `window`, no real origin) would throw. Also skips
  // server-side rendering paths, where this overlay is meaningless anyway —
  // the Worker route only exists on the static-mode production deploy.
  if (typeof window === "undefined") return Promise.resolve(null);

  if (attempted && !inFlight) return Promise.resolve(lastResult);
  if (inFlight) return inFlight;

  attempted = true;
  inFlight = doFetch().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doFetch(): Promise<CatalogPayload | null> {
  try {
    // Relative, same-origin path — NEVER a hardcoded okumo.dev host. A
    // self-hosted copy of the static build must overlay against its OWN
    // Worker (or get a harmless 404), not phone the owner's deployment.
    // No custom headers: keeps this a CORS-simple request (irrelevant here
    // since it's same-origin, but also means no preflight if that ever
    // changes) and matches the origin gate's same-origin-GET-with-no-Origin
    // allowance (worker/src/origin.ts / test/origin.test.ts).
    const res = await fetch("/api/llm-catalog", { method: "GET" });
    if (!res.ok) return null; // includes the expected 404 in server mode

    const raw: unknown = await res.json();
    const parsed = CatalogPayloadSchema.safeParse(raw);
    if (!parsed.success) return null; // unexpected shape: ignore wholesale, no partial apply

    applyOverlay(parsed.data);
    lastResult = parsed.data;
    return parsed.data;
  } catch {
    // Network error, JSON parse error, anything else — silent fallback.
    return null;
  }
}

/** Patches label/price onto MODEL_REGISTRY entries that already exist in the
 * embedded build. Ids the overlay mentions that aren't in MODEL_REGISTRY are
 * skipped (never inserted) — adding a genuinely new model id is a provider
 * catalog change (profiles/defaultModels/PRESETS), out of this module's
 * scope, see the file header. */
function applyOverlay(payload: CatalogPayload): void {
  for (const patch of payload.models) {
    const existing = MODEL_REGISTRY[patch.id];
    if (!existing) continue;
    existing.label = patch.label;
    existing.priceInPerMtok = patch.priceInPerMtok;
    existing.priceOutPerMtok = patch.priceOutPerMtok;
  }
}

/** The last successfully fetched+validated payload's staleWarnings, or an
 * empty array if the overlay has never succeeded (never fetched, still in
 * flight, or every attempt so far failed/was invalid). No UI currently reads
 * this — exposed for a future settings/wizard surface (T-061/T-063
 * territory, outside this ticket's fence) to show "N models the catalog
 * curator should check" without duplicating the fetch/validate/cache logic
 * here. */
export function getCatalogOverlayWarnings(): CatalogPayload["staleWarnings"] {
  return lastResult?.staleWarnings ?? [];
}

/** Test-only reset — clears the module-level cache/in-flight state between
 * test cases. Not exported from any barrel a component could reach. */
export function _resetCatalogOverlayForTests(): void {
  lastResult = null;
  attempted = false;
  inFlight = null;
}
