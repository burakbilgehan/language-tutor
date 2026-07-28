/**
 * T-058: the versioned catalog payload served by `GET /api/llm-catalog`.
 *
 * Deliberately NOT the full `ProviderCatalogEntry` shape from the app's
 * `src/lib/llm/catalog.ts` (profiles, defaultModels per provider) — the
 * client-side overlay (src/lib/llm/catalog-refresh.ts) only ever patches
 * MODEL_REGISTRY entries (label/price for an id that already exists in the
 * embedded build), never adds new provider ids or restructures profiles. A
 * bigger payload here would invite a bigger client-side merge than the fence
 * allows (see T-058 ticket: "Bir komponent bağlantı noktası KAÇINILMAZ
 * görünüyorsa DUR" — new *providers* would need PRESETS/UI changes outside
 * this fence, so this payload structurally cannot carry one).
 *
 * `version` is a plain incrementing integer Burak bumps by hand alongside
 * catalog.ts edits — matches the ticket's "sürümlü katalog JSON'u" and gives
 * the client something to log/guard on, without inventing content hashing
 * infrastructure for a file edited a few times a year.
 */

export interface CatalogModelPatch {
  id: string;
  label: string;
  priceInPerMtok: number;
  priceOutPerMtok: number;
}

export interface CatalogPayload {
  version: number;
  publishedAt: string;
  models: CatalogModelPatch[];
}

/**
 * The catalog data itself. Mirrors `src/lib/llm/catalog.ts` MODEL_REGISTRY
 * (2026-07-28 snapshot) — same reasoning as catalog-data.ts for why this is a
 * separate copy rather than a cross-package import. Bump `version` and this
 * list together whenever the app catalog changes model ids/labels/prices.
 */
export const CATALOG_PAYLOAD: CatalogPayload = {
  version: 1,
  publishedAt: "2026-07-28T00:00:00.000Z",
  models: [
    { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", priceInPerMtok: 1, priceOutPerMtok: 5 },
    { id: "claude-sonnet-5", label: "Claude Sonnet 5", priceInPerMtok: 2, priceOutPerMtok: 10 },
    { id: "claude-opus-5", label: "Claude Opus 5", priceInPerMtok: 5, priceOutPerMtok: 25 },
    { id: "haiku", label: "Claude Haiku (CLI alias)", priceInPerMtok: 0, priceOutPerMtok: 0 },
    { id: "sonnet", label: "Claude Sonnet (CLI alias)", priceInPerMtok: 0, priceOutPerMtok: 0 },
    { id: "opus", label: "Claude Opus (CLI alias)", priceInPerMtok: 0, priceOutPerMtok: 0 },
    { id: "deepseek-chat", label: "DeepSeek Chat (V3 nesli)", priceInPerMtok: 0.28, priceOutPerMtok: 0.42 },
    { id: "deepseek-reasoner", label: "DeepSeek Reasoner (R1 nesli)", priceInPerMtok: 0.55, priceOutPerMtok: 2.19 },
    { id: "gpt-5.4-nano", label: "GPT-5.4 Nano", priceInPerMtok: 0.2, priceOutPerMtok: 1.25 },
    { id: "gpt-5.4-mini", label: "GPT-5.4 Mini", priceInPerMtok: 0.75, priceOutPerMtok: 4.5 },
    { id: "gpt-5.4", label: "GPT-5.4", priceInPerMtok: 2.5, priceOutPerMtok: 15 },
    { id: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5 (OpenRouter)", priceInPerMtok: 1, priceOutPerMtok: 5 },
    { id: "anthropic/claude-sonnet-5", label: "Claude Sonnet 5 (OpenRouter)", priceInPerMtok: 2, priceOutPerMtok: 10 },
    { id: "anthropic/claude-opus-5", label: "Claude Opus 5 (OpenRouter)", priceInPerMtok: 5, priceOutPerMtok: 25 },
    { id: "deepseek/deepseek-v3.2", label: "DeepSeek V3.2 (OpenRouter)", priceInPerMtok: 0.27, priceOutPerMtok: 0.4 },
    { id: "deepseek/deepseek-r1-0528", label: "DeepSeek R1 (OpenRouter)", priceInPerMtok: 0.5, priceOutPerMtok: 2.15 },
    { id: "qwen2.5:7b", label: "Qwen 2.5 7B (Ollama, yerel)", priceInPerMtok: 0, priceOutPerMtok: 0 },
    { id: "qwen2.5:14b", label: "Qwen 2.5 14B (Ollama, yerel)", priceInPerMtok: 0, priceOutPerMtok: 0 },
    { id: "qwen2.5:32b", label: "Qwen 2.5 32B (Ollama, yerel)", priceInPerMtok: 0, priceOutPerMtok: 0 },
    { id: "local-model", label: "Yerel model (LM Studio)", priceInPerMtok: 0, priceOutPerMtok: 0 },
  ],
};
