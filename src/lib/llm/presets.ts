// Connection presets for the OpenAI-compatible HTTP provider. Thin view over
// the catalog (T-057, src/lib/llm/catalog.ts is the single source of model
// ids/prices now) — kept as its own module because the two settings
// components already import PresetId/PRESETS/PRESET_LIST and the fence for
// T-057 only allows import/constant-line changes there, not a rename.
// `jsonMode` = the endpoint supports response_format:{type:"json_object"}.
// Anthropic is NOT OpenAI-compatible and is handled by a separate provider
// (mode:"anthropic"), so it is not in this table.

import { CATALOG, HTTP_PROVIDER_IDS, type HttpProviderId } from "./catalog";

export type PresetId = HttpProviderId;

export interface ProviderPreset {
  id: PresetId;
  label: string;
  /** OpenAI-compatible base URL (…/v1). Empty for custom. */
  baseUrl: string;
  /** Endpoint honours response_format json_object. */
  jsonMode: boolean;
  /** Default tier→model suggestions (catalog's "balanced" profile); user editable. */
  models: { fast: string; balanced: string; deep: string };
  /** Whether an API key is expected (local servers usually don't need one). */
  needsKey: boolean;
}

export const PRESETS: Record<PresetId, ProviderPreset> = Object.fromEntries(
  HTTP_PROVIDER_IDS.map((id) => {
    const entry = CATALOG[id];
    const preset: ProviderPreset = {
      id,
      label: entry.label,
      baseUrl: entry.baseUrl,
      jsonMode: entry.jsonMode,
      models: { ...entry.defaultModels },
      needsKey: entry.needsKey,
    };
    return [id, preset];
  })
) as Record<PresetId, ProviderPreset>;

export const PRESET_LIST = Object.values(PRESETS);
