// Model kataloğu — TEK kaynak (T-057). Sağlayıcı başına somut fast/balanced/
// deep üçlüsü + insan-okur ad + kaba $/Mtok fiyatı. presets.ts, wizard,
// LlmProviderSection ve tier-çözümleme (config.ts / provider.ts /
// browser-provider.ts) buradan beslenir.
//
// Zero node imports (fs/path yok) — browser-provider.ts ("use client") ve
// server config.ts aynı dosyayı import eder; shared-pure.ts'deki ayrım burada
// da geçerli.
//
// Fiyatlar bilgilendirici (T-060'ın bütçe ipucu için) — sağlayıcı sayfasından
// doğrula, faturalama kararı için kullanma. Yerel/abonelik sağlayıcılarda
// (cli, ollama, lmstudio, bridge) 0 = token başı ek ücret yok.

import { LlmError, type ModelTier } from "./provider-types";

export type ProviderId =
  | "cli"
  | "deepseek"
  | "openai"
  | "openrouter"
  | "ollama"
  | "lmstudio"
  | "bridge"
  | "anthropic"
  | "custom";

export type QualityProfileId = "eco" | "balanced" | "best";

export interface CatalogModel {
  id: string;
  /** İnsan-okur ad, T-060'ın "Kullanılacak: X" satırı için. */
  label: string;
  /** $/1M girdi tokenı. Yerel/abonelik = 0. */
  priceInPerMtok: number;
  /** $/1M çıktı tokenı. Yerel/abonelik = 0. */
  priceOutPerMtok: number;
}

export type TierTriple = { fast: string; balanced: string; deep: string };

export interface QualityProfile {
  id: QualityProfileId;
  /** İnsan-okur ad ("Eko", "Denge", "En iyi"). */
  label: string;
  models: TierTriple;
}

export interface ProviderCatalogEntry {
  id: ProviderId;
  label: string;
  /** OpenAI-uyumlu base URL (…/v1). cli/anthropic/custom'da boş/N/A. */
  baseUrl: string;
  jsonMode: boolean;
  needsKey: boolean;
  /** Eko/Denge/En iyi profilleri — her biri somut fast/balanced/deep üçlüsü. */
  profiles: Record<QualityProfileId, QualityProfile>;
  /** "balanced" profilinin üçlüsü — mevcut config.models default'u ve
   * geriye-dönük preset.models alanı için. */
  defaultModels: TierTriple;
}

// ---------------------------------------------------------------------------
// Model registry — id -> {label, price}. Profiller buraya referans verir ki
// T-060'ın "hangi model çalışacak" satırı ve etiketleri tek yerden gelsin.
// ---------------------------------------------------------------------------

const M = {
  // Anthropic native id'ler (dashed, dated) — 2026-07-28 güncel nesil.
  // Doğrulama: OpenRouter /v1/models canlı listesinde eşleniği var
  // (anthropic/claude-opus-5, anthropic/claude-sonnet-5,
  // anthropic/claude-haiku-4.5) — native slug'lar Anthropic'in kendi
  // dokümantasyon konvansiyonundan (claude-<tier>-<major>[-<minor>]).
  // Haiku 5 yok — güncel haiku hâlâ 4.5 nesli (OpenRouter'da doğrulandı).
  "claude-haiku-4-5-20251001": {
    label: "Claude Haiku 4.5",
    priceInPerMtok: 1,
    priceOutPerMtok: 5,
  },
  "claude-sonnet-5": {
    label: "Claude Sonnet 5",
    priceInPerMtok: 2,
    priceOutPerMtok: 10,
  },
  "claude-opus-5": {
    label: "Claude Opus 5",
    priceInPerMtok: 5,
    priceOutPerMtok: 25,
  },
  // CLI kısa alias'ları — claude-cli.ts `--model` bunları olduğu gibi kabul
  // eder (Max aboneliği, token başı ücret yok). Ayrı registry girdisi: native
  // id'lerle karışmasın, provider.ts'in "opus/sonnet/haiku" davranışı korunsun.
  haiku: { label: "Claude Haiku (CLI alias)", priceInPerMtok: 0, priceOutPerMtok: 0 },
  sonnet: { label: "Claude Sonnet (CLI alias)", priceInPerMtok: 0, priceOutPerMtok: 0 },
  opus: { label: "Claude Opus (CLI alias)", priceInPerMtok: 0, priceOutPerMtok: 0 },

  // DeepSeek — kendi native API'sinin sürümden-bağımsız alias'ları
  // (api.deepseek.com), OpenRouter slug'ı DEĞİL. Bu id'ler "bayat" değil:
  // deepseek-chat/deepseek-reasoner her zaman DeepSeek'in o anki güncel
  // modelini gösterir (bknz. DeepSeek API docs) — T-057 kapsamında bilerek
  // değiştirilmedi. Fiyat DeepSeek'in kendi fiyat sayfasından yaklaşık
  // (OpenRouter'daki deepseek-v3.2/r1-0528 fiyatlarına yakın) — doğrulanamadı,
  // yaklaşık işaretli.
  "deepseek-chat": {
    label: "DeepSeek Chat (V3 nesli)",
    priceInPerMtok: 0.28,
    priceOutPerMtok: 0.42,
  },
  "deepseek-reasoner": {
    label: "DeepSeek Reasoner (R1 nesli)",
    priceInPerMtok: 0.55,
    priceOutPerMtok: 2.19,
  },

  // OpenAI native id'ler — OpenRouter'ın openai/* girdilerinden prefix
  // sökülerek çıkarıldı (native API aynı id'yi kullanır) — INFERRED, OpenAI'nin
  // kendi /v1/models'ına karşı doğrulanmadı (key gerektiriyor).
  "gpt-5.4-nano": { label: "GPT-5.4 Nano", priceInPerMtok: 0.2, priceOutPerMtok: 1.25 },
  "gpt-5.4-mini": { label: "GPT-5.4 Mini", priceInPerMtok: 0.75, priceOutPerMtok: 4.5 },
  "gpt-5.4": { label: "GPT-5.4", priceInPerMtok: 2.5, priceOutPerMtok: 15 },

  // OpenRouter — canlı /v1/models'a karşı doğrulandı (2026-07-28).
  "anthropic/claude-haiku-4.5": {
    label: "Claude Haiku 4.5 (OpenRouter)",
    priceInPerMtok: 1,
    priceOutPerMtok: 5,
  },
  "anthropic/claude-sonnet-5": {
    label: "Claude Sonnet 5 (OpenRouter)",
    priceInPerMtok: 2,
    priceOutPerMtok: 10,
  },
  "anthropic/claude-opus-5": {
    label: "Claude Opus 5 (OpenRouter)",
    priceInPerMtok: 5,
    priceOutPerMtok: 25,
  },
  "deepseek/deepseek-v3.2": {
    label: "DeepSeek V3.2 (OpenRouter)",
    priceInPerMtok: 0.27,
    priceOutPerMtok: 0.4,
  },
  "deepseek/deepseek-r1-0528": {
    label: "DeepSeek R1 (OpenRouter)",
    priceInPerMtok: 0.5,
    priceOutPerMtok: 2.15,
  },

  // Ollama — model tag'leri canlı doğrulandı: registry.ollama.ai'nin Docker
  // manifest API'sine karşı (key gerektirmez) qwen2.5:7b / :14b / :32b üçü de
  // HTTP 200 döndü (2026-07-28). llama3.x da hâlâ yayında ama qwen2.5 ailesi
  // daha güncel/isabetli bir küçük-orta-büyük üçlüsü sağlıyor.
  "qwen2.5:7b": { label: "Qwen 2.5 7B (Ollama, yerel)", priceInPerMtok: 0, priceOutPerMtok: 0 },
  "qwen2.5:14b": { label: "Qwen 2.5 14B (Ollama, yerel)", priceInPerMtok: 0, priceOutPerMtok: 0 },
  "qwen2.5:32b": { label: "Qwen 2.5 32B (Ollama, yerel)", priceInPerMtok: 0, priceOutPerMtok: 0 },

  "local-model": { label: "Yerel model (LM Studio)", priceInPerMtok: 0, priceOutPerMtok: 0 },
} as const satisfies Record<string, CatalogModel extends never ? never : Omit<CatalogModel, "id">>;

type ModelKey = keyof typeof M;

function model(id: ModelKey): CatalogModel {
  return { id, ...M[id] };
}

/** Full model registry, keyed by id — for lookups (e.g. T-060's "which model
 * will run" line) without re-deriving from a provider entry. */
export const MODEL_REGISTRY: Record<string, CatalogModel> = Object.fromEntries(
  (Object.keys(M) as ModelKey[]).map((id) => [id, model(id)])
);

// Kayıtlı model id'leri (ModelKey) veya boş string ("custom" sağlayıcısının
// doldurulmamış varsayılanı) kabul eder — kayıt dışı id'ler describeModel()
// ile zaten güvenli çözülüyor.
function triple(
  fast: ModelKey | "",
  balanced: ModelKey | "",
  deep: ModelKey | ""
): TierTriple {
  return { fast, balanced, deep };
}

function profiles(
  eco: TierTriple,
  balanced: TierTriple,
  best: TierTriple
): Record<QualityProfileId, QualityProfile> {
  return {
    eco: { id: "eco", label: "Eko", models: eco },
    balanced: { id: "balanced", label: "Denge", models: balanced },
    best: { id: "best", label: "En iyi", models: best },
  };
}

// ---------------------------------------------------------------------------
// Provider catalog
// ---------------------------------------------------------------------------

export const CATALOG: Record<ProviderId, ProviderCatalogEntry> = {
  cli: {
    id: "cli",
    label: "Claude CLI (Max aboneliği)",
    baseUrl: "",
    jsonMode: false,
    needsKey: false,
    profiles: profiles(
      triple("haiku", "haiku", "sonnet"),
      triple("haiku", "sonnet", "opus"),
      triple("sonnet", "opus", "opus")
    ),
    defaultModels: triple("haiku", "sonnet", "opus"),
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic API anahtarı",
    baseUrl: "https://api.anthropic.com/v1",
    jsonMode: false,
    needsKey: true,
    profiles: profiles(
      triple(
        "claude-haiku-4-5-20251001",
        "claude-haiku-4-5-20251001",
        "claude-sonnet-5"
      ),
      triple("claude-haiku-4-5-20251001", "claude-sonnet-5", "claude-opus-5"),
      triple("claude-sonnet-5", "claude-opus-5", "claude-opus-5")
    ),
    defaultModels: triple(
      "claude-haiku-4-5-20251001",
      "claude-sonnet-5",
      "claude-opus-5"
    ),
  },
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    jsonMode: true,
    needsKey: true,
    profiles: profiles(
      triple("deepseek-chat", "deepseek-chat", "deepseek-chat"),
      triple("deepseek-chat", "deepseek-chat", "deepseek-reasoner"),
      triple("deepseek-chat", "deepseek-reasoner", "deepseek-reasoner")
    ),
    defaultModels: triple("deepseek-chat", "deepseek-chat", "deepseek-reasoner"),
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    jsonMode: true,
    needsKey: true,
    profiles: profiles(
      triple("gpt-5.4-nano", "gpt-5.4-nano", "gpt-5.4-mini"),
      triple("gpt-5.4-nano", "gpt-5.4-mini", "gpt-5.4"),
      triple("gpt-5.4-mini", "gpt-5.4", "gpt-5.4")
    ),
    defaultModels: triple("gpt-5.4-nano", "gpt-5.4-mini", "gpt-5.4"),
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    jsonMode: true,
    needsKey: true,
    profiles: profiles(
      triple(
        "anthropic/claude-haiku-4.5",
        "anthropic/claude-haiku-4.5",
        "deepseek/deepseek-v3.2"
      ),
      triple(
        "anthropic/claude-haiku-4.5",
        "anthropic/claude-sonnet-5",
        "deepseek/deepseek-r1-0528"
      ),
      triple(
        "anthropic/claude-sonnet-5",
        "anthropic/claude-opus-5",
        "anthropic/claude-opus-5"
      )
    ),
    defaultModels: triple(
      "anthropic/claude-haiku-4.5",
      "anthropic/claude-sonnet-5",
      "deepseek/deepseek-r1-0528"
    ),
  },
  ollama: {
    id: "ollama",
    label: "Ollama (yerel)",
    baseUrl: "http://localhost:11434/v1",
    jsonMode: true,
    needsKey: false,
    profiles: profiles(
      triple("qwen2.5:7b", "qwen2.5:7b", "qwen2.5:14b"),
      triple("qwen2.5:7b", "qwen2.5:14b", "qwen2.5:32b"),
      triple("qwen2.5:14b", "qwen2.5:32b", "qwen2.5:32b")
    ),
    defaultModels: triple("qwen2.5:7b", "qwen2.5:14b", "qwen2.5:32b"),
  },
  lmstudio: {
    id: "lmstudio",
    label: "LM Studio (yerel)",
    baseUrl: "http://localhost:1234/v1",
    jsonMode: false,
    needsKey: false,
    profiles: profiles(
      triple("local-model", "local-model", "local-model"),
      triple("local-model", "local-model", "local-model"),
      triple("local-model", "local-model", "local-model")
    ),
    defaultModels: triple("local-model", "local-model", "local-model"),
  },
  bridge: {
    // scripts/llm-bridge.mjs: yerel claude/codex/copilot/gemini/opencode
    // CLI'sını OpenAI-uyumlu endpoint'e çevirir (abonelik, API key'siz).
    // Bu katalog default'u yalnız claude backend'i için gerçek alias'lar
    // taşır (haiku/sonnet/opus, claude CLI bunları anlar). codex/copilot/
    // gemini'nin kendi model alias'ı yok — llm-bridge.mjs, "fast"/"balanced"/
    // "deep" LITERAL string'ini "model seçilmedi, backend kendi varsayılanını
    // kullansın" sentineli olarak okur (bilinmeyen bir modeli o CLI'lara
    // geçirmek patlar). O sentinel'in ayakta kalması için
    // LlmSetupWizard.tsx'teki SUB_BACKENDS.codex/copilot/gemini kendi
    // models alanını BOŞ STRING değil, tier adının kendisini
    // ({fast:"fast",...}) taşır — boş string falsy olduğundan
    // resolveModelId() config'i atlayıp BU girdinin defaultModels'ına
    // (gerçek claude alias'ı) düşerdi, sentineli kırardı (T-057'de bulunan
    // regresyon, aynı PR'da düzeltildi).
    id: "bridge",
    label: "Yerel köprü (llm-bridge: claude/codex/...)",
    baseUrl: "http://localhost:8484/v1",
    jsonMode: false,
    needsKey: false,
    profiles: profiles(
      triple("haiku", "haiku", "sonnet"),
      triple("haiku", "sonnet", "opus"),
      triple("sonnet", "opus", "opus")
    ),
    defaultModels: triple("haiku", "sonnet", "opus"),
  },
  custom: {
    id: "custom",
    label: "Özel (OpenAI uyumlu)",
    baseUrl: "",
    jsonMode: false,
    needsKey: false,
    profiles: profiles(
      triple("", "", ""),
      triple("", "", ""),
      triple("", "", "")
    ),
    defaultModels: triple("", "", ""),
  },
};

export const CATALOG_LIST = Object.values(CATALOG);

/** HTTP-uyumlu (mode:"openai") sağlayıcı alt-kümesi — presets.ts'in eski
 * PRESET_LIST/PRESETS export'larının yerini alır (cli/anthropic hariç: onlar
 * kendi mode'una ait, preset dropdown'ında görünmez). */
export const HTTP_PROVIDER_IDS = [
  "deepseek",
  "openai",
  "openrouter",
  "ollama",
  "lmstudio",
  "bridge",
  "custom",
] as const satisfies readonly ProviderId[];

export type HttpProviderId = (typeof HTTP_PROVIDER_IDS)[number];

/** baseUrl → provider eşlemesi (Settings formunun preset dropdown'ını stored
 * config'e senkronlamak için; LlmProviderSection'ın bugünkü PRESET_LIST.find
 * mantığının katalog karşılığı). */
export function providerForBaseUrl(baseUrl: string | undefined): ProviderId | undefined {
  if (!baseUrl) return undefined;
  const match = CATALOG_LIST.find((p) => p.baseUrl && p.baseUrl === baseUrl);
  return match?.id;
}

/** id → model kayıt bilgisi (T-060'ın "Kullanılacak: X" satırı içindir).
 * Kayıt dışı bir id (özel/custom girilmiş) için id'yi label olarak döndürür. */
export function describeModel(id: string): CatalogModel {
  return MODEL_REGISTRY[id] ?? { id, label: id, priceInPerMtok: 0, priceOutPerMtok: 0 };
}

// ---------------------------------------------------------------------------
// Tier resolution — TEK helper. config.ts (server), provider.ts (CLI) ve
// browser-provider.ts hepsi bunu çağırır; process.env burada OKUNMAZ (bu
// dosya tarayıcı bundle'ına da giriyor) — çağıran env'i parametre olarak
// geçirir.
// ---------------------------------------------------------------------------

export interface ResolveModelInput {
  tier: ModelTier;
  /** Kayıtlı config'in models alanı (varsa). */
  configModels?: { fast?: string; balanced?: string; deep?: string };
  /** Sunucu tarafında process.env'den okunmuş tier→model; tarayıcıda yok. */
  envModels?: { fast?: string; balanced?: string; deep?: string };
  /** Aktif sağlayıcı — katalog default'una düşmek için. */
  provider: ProviderId;
}

/** tier → model id. Sıra: config.models[tier] → env[tier] → katalogdaki
 * sağlayıcının balanced-profil default'u → hata (literal tier string'i ASLA
 * sızdırma — eski bug buydu). CLI kısa-alias davranışı (haiku/sonnet/opus)
 * `cli` sağlayıcısının defaultModels'ı üzerinden korunur. */
export function resolveModelId(input: ResolveModelInput): string {
  const fromConfig = input.configModels?.[input.tier];
  if (fromConfig) return fromConfig;
  const fromEnv = input.envModels?.[input.tier];
  if (fromEnv) return fromEnv;
  const entry = CATALOG[input.provider];
  const fallback = entry?.defaultModels[input.tier];
  if (fallback) return fallback;
  throw new LlmError(
    `Model çözülemedi: sağlayıcı "${input.provider}", tier "${input.tier}" için config/env/katalogda id yok.`
  );
}
