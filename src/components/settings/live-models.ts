// T-061: canlı model listeleri — Ollama tags / OpenRouter models. Saf
// fetch helper'ları, React yok: LlmAdvancedPanel.tsx tüketir.
//
// Bridge burada YOK: scripts/llm-bridge.mjs'in GET /v1/models'ı
// `{ data: [{ id: BACKEND }] }` döner — BACKEND, --backend ile seçilen CLI
// adı (claude/codex/...), gerçek bir MODEL listesi değil. "Model seçilebilir
// liste" iddiasıyla göstermek yalan olur; panel bunun yerine mevcut
// /health probu'ndan (useLocalLlmProbe, T-063'ün alanı, burada yalnız
// TÜKETİLİYOR) gelen aktif backend adını gösterir.
//
// OpenAI/DeepSeek/Anthropic bilinçli olarak YOK (ticket'ta net): key'siz
// canlı uç yok, T-057 küratörlü kataloğu yeter.

/** Tek bir asenkron kaynağın üç hâli — component'lerin ayrı "loading/error/
 * data" state üçlüsü icat etmesine gerek kalmasın. */
export type FetchState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; data: T };

const LIVE_FETCH_TIMEOUT_MS = 4000;

async function fetchJsonWithTimeout(
  url: string,
  signal: AbortSignal
): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LIVE_FETCH_TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  signal.addEventListener("abort", onAbort);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}

// ---------------------------------------------------------------------------
// Ollama — GET :11434/api/tags (key'siz, yerel)
// ---------------------------------------------------------------------------

/** `ollama pull` ile inmiş bir model tag'i. */
export interface OllamaTag {
  /** Tam tag, ör. "qwen2.5:7b" ya da "qwen2.5:latest". */
  name: string;
}

export async function fetchOllamaTags(
  baseUrl: string,
  signal: AbortSignal
): Promise<OllamaTag[]> {
  // baseUrl ".../v1" — Ollama'nın kendi API'si /v1 dışında, kökte.
  const root = baseUrl.replace(/\/v1\/?$/, "");
  const body = (await fetchJsonWithTimeout(`${root}/api/tags`, signal)) as {
    models?: { name?: string }[];
  };
  return (body.models ?? [])
    .map((m) => m.name)
    .filter((n): n is string => Boolean(n))
    .map((name) => ({ name }));
}

/** "qwen2.5" (kullanıcının yazdığı, tag'siz) ile "qwen2.5:latest" (Ollama'nın
 * indirdiği) aynı modeldir — ":latest" ekini iki yandan da soyarak
 * karşılaştır. Tag'i olmayan girdi (bare id) da "var" sayılmalı: kullanıcı
 * `ollama pull qwen2.5` çalıştırdıysa tam adı `qwen2.5:latest`tir ama
 * kataloğun/panelin varsayılan önerisi çoğu zaman bare id taşımaz — yine de
 * ":latest"i her iki tarafta normalize etmek yeterli, çünkü katalog önerileri
 * zaten somut tag taşıyor (qwen2.5:7b gibi).
 */
function foldOllamaTag(tag: string): string {
  return tag.replace(/:latest$/, "");
}

export function ollamaTagIsPulled(modelId: string, tags: OllamaTag[]): boolean {
  const folded = foldOllamaTag(modelId);
  return tags.some((t) => foldOllamaTag(t.name) === folded);
}

// ---------------------------------------------------------------------------
// OpenRouter — GET /api/v1/models (key'siz, public)
// ---------------------------------------------------------------------------

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

export interface OpenRouterModel {
  id: string;
  name: string;
  /** $/1M girdi/çıktı tokenı — kaynakta $/token string olarak gelir, burada
   * zaten Mtok'a çevrilmiş. Fiyatı olmayan (ör. "openrouter/auto") satırlarda
   * null — 0 ile karıştırma, "bilinmiyor" ile "ücretsiz" farklı anlamlar. */
  priceInPerMtok: number | null;
  priceOutPerMtok: number | null;
  free: boolean;
  contextLength: number | null;
}

interface OpenRouterApiModel {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
}

/** $/token string'i $/Mtok sayıya çevirir. null dönen üç durum: boş string
 * (bazı meta-modellerde `pricing.prompt` boş), NaN üreten string, ve NEGATİF
 * değer — OpenRouter "openrouter/auto" gibi dinamik-fiyatlı yönlendirici
 * modellerde "-1" sentinel'i kullanıyor (canlı uçta doğrulandı, 2026-07-28:
 * auto/auto-beta/fusion/pareto-code/bodybuilder). "-1"i olduğu gibi Mtok'a
 * çevirip göstermek "-$1.00" gibi anlamsız bir fiyat sızdırırdı. */
function toPerMtok(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n * 1_000_000;
}

export async function fetchOpenRouterModels(
  signal: AbortSignal
): Promise<OpenRouterModel[]> {
  const body = (await fetchJsonWithTimeout(
    OPENROUTER_MODELS_URL,
    signal
  )) as { data?: OpenRouterApiModel[] };
  return (body.data ?? []).map((m) => {
    const priceInPerMtok = toPerMtok(m.pricing?.prompt);
    const priceOutPerMtok = toPerMtok(m.pricing?.completion);
    return {
      id: m.id,
      name: m.name ?? m.id,
      priceInPerMtok,
      priceOutPerMtok,
      // ":free" id son eki OpenRouter'ın kendi konvansiyonu; ayrıca fiyatı
      // BİLİNEN ve tam 0 olan satırları da ücretsiz say. Fiyatı bilinmeyen
      // (null) satırı asla ücretsiz sayma — "bilinmiyor" != "bedava".
      free:
        m.id.endsWith(":free") ||
        (priceInPerMtok === 0 && priceOutPerMtok === 0),
      contextLength: m.context_length ?? null,
    };
  });
}

export function openRouterModelById(
  models: OpenRouterModel[],
  id: string
): OpenRouterModel | undefined {
  return models.find((m) => m.id === id);
}

/** Kısaltılmış fiyat metni: "$2 / $10" (girdi/çıktı $-Mtok). `free`/fiyatı
 * bilinmiyor (null) durumlarını KENDİ döndürmez (Türkçe "ücretsiz" gibi bir
 * dil kararı burada verilmez — bu dosya i18n görmez); çağıran `m.free` ve
 * null'ı kontrol edip kendi copy'sini basar. */
export function formatOpenRouterPrice(m: OpenRouterModel): string | null {
  if (m.priceInPerMtok === null || m.priceOutPerMtok === null) return null;
  const fmt = (n: number) => (n < 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(1)}`);
  return `${fmt(m.priceInPerMtok)} / ${fmt(m.priceOutPerMtok)}`;
}
