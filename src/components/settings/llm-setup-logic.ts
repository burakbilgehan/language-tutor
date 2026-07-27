// T-060: LLM sihirbazının SAF mantığı — React yok, JSX yok, CSS yok.
// Ayrı dosya olmasının iki nedeni var:
//  1. Test edilebilirlik: `npm test` glob'u `src/lib/**/*.test.ts` köküne
//     bağlı (package.json fence dışı), o yüzden testi src/lib/ altında
//     duruyor ve BU modülü import ediyor. Buraya bir komponent sızarsa
//     `tsx --test` JSX'te ölür — import listesini saf tut.
//  2. Kalite profili ↔ katalog eşlemesi, bütçe tahmini ve "kayıtlı config
//     hangi profil?" çıkarımı sihirbazın en riskli mantığı; UI'dan ayrı
//     durunca gözden kaçmıyor.
//
// Katalog (src/lib/llm/catalog.ts, T-057) TEK kaynak — burada model id'si
// veya fiyat SABİTLENMEZ, hepsi oradan okunur.

import {
  CATALOG,
  MODEL_REGISTRY,
  describeModel,
  type ProviderId,
  type QualityProfileId,
  type TierTriple,
} from "@/lib/llm/catalog";

export type { QualityProfileId, TierTriple };

export const QUALITY_IDS = ["eco", "balanced", "best"] as const;

/** Köprü backend'leri (packages/okumo-bridge). `claude` dışındakiler kendi
 * model alias'ına sahip değil. */
export type SubBackend = "claude" | "codex" | "copilot" | "gemini" | "opencode";

/** llm-bridge.mjs'in "model seçilmedi, backend kendi varsayılanını kullansın"
 * sentineli. Tier adının KENDİSİ değer olarak yazılır — boş string falsy
 * olduğu için resolveModelId() katalog default'una (gerçek claude alias'ı)
 * düşer ve codex/gemini CLI'sı bilinmeyen modelde patlardı. Bu T-057'de
 * bulunup düzeltilen regresyonun ta kendisi; catalog.test.ts çözümleme
 * tarafını kilitliyor, buradaki test de UI tarafını kilitler. */
export const BRIDGE_SENTINEL_TRIPLE: TierTriple = {
  fast: "fast",
  balanced: "balanced",
  deep: "deep",
};

/** Köprü backend'i kendi model alias'ını taşıyor mu? Yalnız `claude`
 * (haiku/sonnet/opus) taşır — diğerleri sentinel kullanır, dolayısıyla
 * onlarda kalite profili SEÇİMİ ANLAMSIZDIR ve UI'da gösterilmez. */
export function backendSupportsQuality(backend: SubBackend): boolean {
  return backend === "claude";
}

/**
 * Seçilen kalite profilinin somut fast/balanced/deep üçlüsü.
 *
 * Köprü istisnası: backend claude değilse profil ne olursa olsun sentinel
 * üçlüsü döner (yukarıdaki gerekçe). Bu fonksiyon, kaydedilen `models`
 * alanının TEK üreticisidir — UI hiçbir yerde elle üçlü kurmaz.
 */
export function modelsForQuality(
  provider: ProviderId,
  quality: QualityProfileId,
  backend?: SubBackend
): TierTriple {
  if (provider === "bridge" && backend && !backendSupportsQuality(backend)) {
    return { ...BRIDGE_SENTINEL_TRIPLE };
  }
  return { ...CATALOG[provider].profiles[quality].models };
}

/**
 * Kayıtlı `models` üçlüsünden kalite profilini geri çıkar (config'te profil
 * alanı YOK — llmConfigPut yalnız çözülmüş üçlüyü taşır ve client-api fence
 * dışında). Eşleşme yoksa null döner: UI "Özel" gösterir, radio'yu zorla
 * seçmez — yoksa kullanıcının gelişmiş panelde elle girdiği modeller, ekranı
 * her açışında bir profile "yuvarlanmış" gibi görünürdü.
 */
export function qualityForModels(
  provider: ProviderId,
  models: { fast?: string; balanced?: string; deep?: string } | undefined,
  backend?: SubBackend
): QualityProfileId | null {
  if (!models) return null;
  // Sentinel taşıyan köprü backend'lerinde profil kavramı yok.
  if (provider === "bridge" && backend && !backendSupportsQuality(backend)) {
    return null;
  }
  const entry = CATALOG[provider];
  if (!entry) return null;
  for (const id of QUALITY_IDS) {
    const t = entry.profiles[id].models;
    if (
      t.fast === (models.fast ?? "") &&
      t.balanced === (models.balanced ?? "") &&
      t.deep === (models.deep ?? "")
    ) {
      return id;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// "Kullanılacak: X · Y" görünürlük satırı
// ---------------------------------------------------------------------------

export interface ModelLine {
  /** Hızlı işler (kelime, değerlendirme) modeli. */
  fastLabel: string;
  /** Ders/gramer üretimi modeli. */
  deepLabel: string;
  /** İkisi aynı modelse tek etiket göster. */
  same: boolean;
}

/**
 * Hangi modelin çalışacağını ASLA gizleme (T-060/3 — bugünkü şikâyet:
 * "DeepSeek seçtim, hangi model çalışıyor belli değil"). Sentinel taşıyan
 * köprü backend'lerinde model adı yoktur; null döner ve UI "backend'in kendi
 * varsayılanı" der — uydurma bir model adı yazmaktansa dürüst boşluk.
 */
export function modelLineFor(models: TierTriple): ModelLine | null {
  if (
    models.fast === BRIDGE_SENTINEL_TRIPLE.fast &&
    models.deep === BRIDGE_SENTINEL_TRIPLE.deep
  ) {
    return null;
  }
  if (!models.fast && !models.deep) return null;
  const fastLabel = describeModel(models.fast).label;
  const deepLabel = describeModel(models.deep).label;
  return { fastLabel, deepLabel, same: models.fast === models.deep };
}

// ---------------------------------------------------------------------------
// Kaba aylık bütçe ipucu
// ---------------------------------------------------------------------------

/**
 * "Tipik kullanım" varsayımı — haftada ~4 ders + değerlendirme/gramer
 * trafiği için kaba token hacmi. Ölçüm değil, büyüklük mertebesi: kullanıcı
 * "sentler mi, on dolarlar mı?" sorusuna cevap alsın diye. Ders üretimi deep
 * tier'da, kısa işler fast tier'da varsayılır.
 */
const MONTHLY_USAGE = {
  deep: { inMtok: 0.6, outMtok: 0.35 },
  fast: { inMtok: 1.2, outMtok: 0.5 },
} as const;

export type BudgetHint =
  /** Yerel/abonelik: token başı ücret yok. */
  | { kind: "free" }
  /** Katalogda fiyatı bilinen modeller — kaba aylık $ tahmini. */
  | { kind: "estimate"; usdPerMonth: number }
  /** Model katalogda yok (özel endpoint / elle girilmiş id): tahmin YOK.
   * describeModel() bilinmeyen id'ye 0 fiyat verir; onu "$0/ay" diye
   * göstermek düpedüz yalan olurdu. */
  | { kind: "unknown" };

export function budgetHintFor(
  provider: ProviderId,
  models: TierTriple
): BudgetHint {
  // Özel endpoint'in fiyatını bilemeyiz.
  if (provider === "custom") return { kind: "unknown" };
  // Köprü sentineli: model adı yok ama abonelik/yerel olduğu kesin.
  const sentinel =
    models.fast === BRIDGE_SENTINEL_TRIPLE.fast &&
    models.deep === BRIDGE_SENTINEL_TRIPLE.deep;
  if (sentinel) return { kind: "free" };

  const ids = [models.fast, models.deep].filter(Boolean);
  if (ids.length === 0) return { kind: "unknown" };
  // Kayıt dışı bir id varsa fiyat gerçekten bilinmiyor demektir.
  if (ids.some((id) => !(id in MODEL_REGISTRY))) return { kind: "unknown" };

  const fast = describeModel(models.fast);
  const deep = describeModel(models.deep);
  const usd =
    MONTHLY_USAGE.fast.inMtok * fast.priceInPerMtok +
    MONTHLY_USAGE.fast.outMtok * fast.priceOutPerMtok +
    MONTHLY_USAGE.deep.inMtok * deep.priceInPerMtok +
    MONTHLY_USAGE.deep.outMtok * deep.priceOutPerMtok;

  // Katalogda fiyatı 0 olan (cli alias'ları, ollama tag'leri, lmstudio)
  // = abonelik/yerel: "ücretsiz" demek doğru, "$0.00/ay" demek garip.
  if (usd === 0) return { kind: "free" };
  return { kind: "estimate", usdPerMonth: usd };
}

/** Tahmini gösterilebilir bir metne çevir: sentin altı "<$1", üstü tek
 * ondalık. Para birimi/etiket copy tarafında (i18n) eklenir. */
export function formatUsdPerMonth(usd: number): string {
  if (usd < 1) return "<$1";
  return `~$${usd < 10 ? usd.toFixed(1) : Math.round(usd)}`;
}

// ---------------------------------------------------------------------------
// Ollama: profile göre indirilecek tag'ler
// ---------------------------------------------------------------------------

/**
 * `ollama pull` komutu SEÇİLEN profilin üçlüsünden türer. Katalog
 * default'undan (balanced) türetmek bir hataydı: "En iyi" seçen kullanıcı
 * 14b/32b'ye ihtiyaç duyarken 7b/14b indirir, üretim indirmediği modelde
 * patlardı.
 */
export function ollamaPullCommand(models: TierTriple): string {
  const tags = Array.from(
    new Set([models.fast, models.balanced, models.deep].filter(Boolean))
  );
  return tags.map((tag) => `ollama pull ${tag}`).join(" && ");
}
