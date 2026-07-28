"use client";

// T-060/4: eski LlmProviderSection'ın erimiş hâli. Ayrı bir "LLM Sağlayıcı"
// yüzeyi değil, sihirbazın içindeki "Gelişmiş" accordion'ının gövdesi:
// nokta atışı model id'leri, custom base URL, jsonMode, ekstra backend'ler,
// ve CLI modu (server-mode, sahibin kullanımı) aynen burada.
//
// Kasıtlı olarak KENDİ dosyasında ve dar arayüzlü: T-061 (canlı model
// listeleri) buraya bağlandı, T-063 (bağlantı durumu kartı) sihirbaz
// kabuğuna — ikisi birbirine çarpmıyor.
//
// T-061: canlı model listeleri (live-models.ts). Ollama (/api/tags) ve
// OpenRouter (/api/v1/models) yalnız preset bu ikisiyken ve mod "openai"
// iken yoklanır — DeepSeek/OpenAI/custom kullanıcısı hiçbir ek istek
// görmez. Girdi 400ms debounce'lu: her tuş vuruşunda yeni fetch atmaz.
// Bridge'de CANLI MODEL LİSTESİ YOK (bkz. live-models.ts başlığı) — onun
// yerine köprünün GET /v1/models'ı `{data:[{id:BACKEND}]}` döner, o da
// yalnız "hangi backend ayakta" bilgisini taşır, sağlayıcı seçim kutusu
// değil.

import { useEffect, useMemo, useState } from "react";
import { CozyButton } from "@/components/shared/CozyButton";
import { useStrings } from "@/lib/i18n/use-strings";
import { invalidateLlmStatus } from "@/lib/llm-status";
import { llmConfigGet, llmConfigPut, llmTest } from "@/lib/client-api";
import {
  CATALOG,
  HTTP_PROVIDER_IDS,
  providerForBaseUrl,
  type HttpProviderId,
} from "@/lib/llm/catalog";
import { BRIDGE_SENTINEL_TRIPLE, ollamaPullCommand } from "./llm-setup-logic";
import {
  fetchOllamaTags,
  fetchOpenRouterModels,
  formatOpenRouterPrice,
  ollamaTagIsPulled,
  type FetchState,
  type OllamaTag,
  type OpenRouterModel,
} from "./live-models";

const S = {
  tr: {
    desc: "Modeli, adresi ve modu elle ayarla. API anahtarın yalnızca bu cihazda tutulur — kayıt (save) dosyasına asla girmez.",
    mode: "Bağlantı biçimi",
    modeCli: "Claude CLI (Max aboneliği)",
    modeCliDesc: "Bu makinedeki `claude` girişini kullanır.",
    modeOpenai: "API / Yerel sunucu (OpenAI uyumlu)",
    modeOpenaiDesc: "DeepSeek, OpenAI, OpenRouter, Ollama, LM Studio, köprü...",
    modeAnthropic: "Anthropic API anahtarı",
    modeAnthropicDesc: "console.anthropic.com'dan alınan anahtar.",
    modeNone: "Kapalı",
    modeNoneDesc: "LLM yok — yalnızca hazır (cache'li) içerik çalışır.",
    preset: "Sağlayıcı",
    baseUrl: "Base URL",
    apiKey: "API anahtarı",
    apiKeyKept: "Kayıtlı anahtar korunur — değiştirmek için yenisini yaz.",
    models: "Modeller (hızlı / dengeli / derin)",
    modelsHint:
      "Boş bırakılan alan sağlayıcının katalog varsayılanına düşer.",
    modelsBridgeHint:
      "Köprüde \"fast/balanced/deep\" bırakmak = modeli backend'in kendisi seçsin. Belirli bir model istiyorsan (yalnız claude backend'i anlar) buraya yaz: haiku / sonnet / opus.",
    modelFast: "Hızlı",
    modelBalanced: "Dengeli",
    modelDeep: "Derin",
    jsonMode: "JSON modu (response_format)",
    jsonModeHint:
      "Endpoint `json_object` destekliyorsa açık bırak; desteklemeyende hata verir.",
    save: "Kaydet",
    saving: "Kaydediliyor...",
    saved: "✅ Kaydedildi",
    saveFailed: "❌ Kaydedilemedi",
    test: "Bağlantıyı test et",
    testing: "Test ediliyor...",
    testOk: (s: string) => `✅ Bağlantı sağlıklı (${s}s)`,
    testFailed: "Bağlantı sorunu",
    serverUnreachable: "❌ Sunucuya ulaşılamadı",
    cliHintBefore: "Sorun yaşarsan terminalde",
    cliHintAfter: "çalıştırıp giriş yaptığından emin ol.",
    // --- T-061 canlı listeler
    ollamaLoading: "İndirilen modeller yoklanıyor...",
    ollamaError: "Ollama'ya ulaşılamadı — localhost:11434 çalışıyor mu?",
    ollamaCount: (n: number) => `${n} model indirilmiş.`,
    ollamaNotPulled: "İndirilmemiş model(ler) var — önce çalıştır:",
    openRouterLoading: "OpenRouter kataloğu yoklanıyor...",
    openRouterError: "OpenRouter'a ulaşılamadı.",
    openRouterCount: (n: number) => `${n} model (canlı katalog).`,
    openRouterFreeOnly: "Yalnız :free",
    openRouterSearch: "Modellerde ara...",
    openRouterPrice: (label: string, price: string) => `${label}: ${price}`,
    openRouterFree: "ücretsiz",
    openRouterUnknownPrice: "fiyat bilinmiyor",
    openRouterNotListed: (id: string) => `"${id}" canlı listede yok.`,
    bridgeBackendLoading: "Köprü yoklanıyor...",
    bridgeBackendError:
      "Köprüye ulaşılamadı — çalışmıyor olabilir ya da bu origin --origin ile izinli değil.",
    bridgeBackendFound: (backend: string) => `Aktif backend: ${backend}`,
    testBlockedTitle: "Test edilmedi",
    testBlockedOllama: (id: string) =>
      `"${id}" Ollama'da indirilmemiş görünüyor. Önce indir, sonra tekrar dene.`,
    testBlockedOpenRouter: (id: string) =>
      `"${id}" OpenRouter'ın canlı model listesinde yok. Model id'sini kontrol et.`,
  },
  en: {
    desc: "Set the model, address and mode by hand. Your API key stays only on this device — it never enters a save file.",
    mode: "Connection mode",
    modeCli: "Claude CLI (Max subscription)",
    modeCliDesc: "Uses the `claude` login on this machine.",
    modeOpenai: "API / Local server (OpenAI-compatible)",
    modeOpenaiDesc: "DeepSeek, OpenAI, OpenRouter, Ollama, LM Studio, bridge...",
    modeAnthropic: "Anthropic API key",
    modeAnthropicDesc: "A key from console.anthropic.com.",
    modeNone: "Off",
    modeNoneDesc: "No LLM — only already-generated (cached) content works.",
    preset: "Provider",
    baseUrl: "Base URL",
    apiKey: "API key",
    apiKeyKept: "The stored key is kept — type a new one to replace it.",
    models: "Models (fast / balanced / deep)",
    modelsHint: "An empty field falls back to the provider's catalog default.",
    modelsBridgeHint:
      "Leaving \"fast/balanced/deep\" on the bridge means the backend picks the model itself. For a specific model (only the claude backend understands these) type: haiku / sonnet / opus.",
    modelFast: "Fast",
    modelBalanced: "Balanced",
    modelDeep: "Deep",
    jsonMode: "JSON mode (response_format)",
    jsonModeHint:
      "Leave on if the endpoint supports `json_object`; it errors on ones that don't.",
    save: "Save",
    saving: "Saving...",
    saved: "✅ Saved",
    saveFailed: "❌ Could not save",
    test: "Test connection",
    testing: "Testing...",
    testOk: (s: string) => `✅ Connection healthy (${s}s)`,
    testFailed: "Connection problem",
    serverUnreachable: "❌ Could not reach the server",
    cliHintBefore: "If you run into issues, run",
    cliHintAfter: "in a terminal and make sure you're logged in.",
    // --- T-061 live lists
    ollamaLoading: "Checking downloaded models...",
    ollamaError: "Could not reach Ollama — is localhost:11434 running?",
    ollamaCount: (n: number) => `${n} model(s) downloaded.`,
    ollamaNotPulled: "Some model(s) aren't downloaded yet — run:",
    openRouterLoading: "Checking the OpenRouter catalog...",
    openRouterError: "Could not reach OpenRouter.",
    openRouterCount: (n: number) => `${n} models (live catalog).`,
    openRouterFreeOnly: ":free only",
    openRouterSearch: "Search models...",
    openRouterPrice: (label: string, price: string) => `${label}: ${price}`,
    openRouterFree: "free",
    openRouterUnknownPrice: "price unknown",
    openRouterNotListed: (id: string) => `"${id}" isn't in the live list.`,
    bridgeBackendLoading: "Checking the bridge...",
    bridgeBackendError:
      "Could not reach the bridge — it may not be running, or this origin isn't allowed via --origin.",
    bridgeBackendFound: (backend: string) => `Active backend: ${backend}`,
    testBlockedTitle: "Not tested",
    testBlockedOllama: (id: string) =>
      `"${id}" doesn't look downloaded in Ollama. Pull it first, then try again.`,
    testBlockedOpenRouter: (id: string) =>
      `"${id}" isn't in OpenRouter's live model list. Check the model id.`,
  },
};

type Mode = "cli" | "openai" | "anthropic" | "none";

export interface LlmConfigDto {
  mode: Mode;
  baseUrl?: string;
  apiKeyMasked?: string;
  hasKey: boolean;
  models?: { fast?: string; balanced?: string; deep?: string };
  jsonMode?: boolean;
  concurrency?: number;
  cliAllowed: boolean;
}

const inputCls =
  "w-full rounded-xl border-2 border-surface-2 bg-background px-3 py-2 font-mono text-xs outline-none focus:border-indigo focus:ring-4 focus:ring-indigo/15";

/**
 * @param onSaved Sihirbaz kabuğunun kaydedilmiş config'i tazelemesi için
 *   (gelişmiş panelden yapılan değişiklik casual akıştaki özeti de günceller).
 */
export function LlmAdvancedPanel({ onSaved }: { onSaved?: () => void }) {
  const t = useStrings(S);
  const [config, setConfig] = useState<LlmConfigDto | null>(null);
  const [mode, setMode] = useState<Mode>("openai");
  const [preset, setPreset] = useState<HttpProviderId>("ollama");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState({ fast: "", balanced: "", deep: "" });
  const [jsonMode, setJsonMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const hydrate = (d: LlmConfigDto) => {
    setConfig(d);
    setMode(d.mode);
    setBaseUrl(d.baseUrl ?? "");
    setModels({
      fast: d.models?.fast ?? "",
      balanced: d.models?.balanced ?? "",
      deep: d.models?.deep ?? "",
    });
    setJsonMode(d.jsonMode ?? false);
    // Kayıtlı baseUrl'ü dropdown'a geri eşle (sondaki "/" farkını katalog
    // helper'ı yutar — eşleşmezse "custom").
    const match = providerForBaseUrl(d.baseUrl);
    if (match && (HTTP_PROVIDER_IDS as readonly string[]).includes(match)) {
      setPreset(match as HttpProviderId);
    } else if (d.baseUrl) {
      setPreset("custom");
    }
  };

  useEffect(() => {
    llmConfigGet().then(hydrate).catch(() => {});
  }, []);

  const applyPreset = (id: HttpProviderId) => {
    setPreset(id);
    const entry = CATALOG[id];
    if (entry.baseUrl) setBaseUrl(entry.baseUrl);
    // Köprü istisnası: katalogdaki bridge üçlüsü GERÇEK claude alias'ları
    // (haiku/sonnet/opus), ama köprü codex/copilot/gemini/opencode ile de
    // çalışıyor olabilir ve bu form hangisi olduğunu bilemez. Claude
    // alias'ını körlemesine doldurmak, backend claude değilse her üretimi
    // patlatır (o CLI'lar bilinmeyen modeli reddeder). Sentinel üçlüsü ise
    // HER backend'de doğru: llm-bridge tier adlarını soyar ve backend kendi
    // varsayılanını kullanır — claude dahil. Belirli bir claude modeli
    // isteyen kullanıcı alanlara elle yazar (hint bunu söylüyor).
    setModels(
      id === "bridge" ? { ...BRIDGE_SENTINEL_TRIPLE } : { ...entry.defaultModels }
    );
    setJsonMode(entry.jsonMode);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setSaveMsg(null);
    if (m === "anthropic") {
      // baseUrl'ü BOŞALTMA: sunucu modunda llmConfigured() cli/none dışındaki
      // her modda `Boolean(config?.baseUrl)`e düşüyor, boş baseUrl kaydetmek
      // "kaydedildi" diyip ilk üretimde 503 llm_unconfigured almak demek.
      setBaseUrl(CATALOG.anthropic.baseUrl);
      setModels((prev) =>
        prev.fast || prev.balanced || prev.deep
          ? prev
          : { ...CATALOG.anthropic.defaultModels }
      );
    }
    if (m === "openai" && !baseUrl) applyPreset(preset);
  };

  // --- T-061 canlı model listeleri --------------------------------------
  //
  // Yalnız preset ollama/openrouter/bridge'de ve mod openai'yken çalışır —
  // DeepSeek/OpenAI/custom kullanıcısı için hiçbir ek istek atılmaz (o
  // sağlayıcılarda canlı uç ya key ister ya da gürültülü, ticket'ta bilinçli
  // olarak dışarıda bırakıldı).
  const [ollamaState, setOllamaState] = useState<FetchState<OllamaTag[]>>({
    status: "idle",
  });
  const [openRouterState, setOpenRouterState] = useState<
    FetchState<OpenRouterModel[]>
  >({ status: "idle" });
  const [bridgeBackend, setBridgeBackend] = useState<FetchState<string>>({
    status: "idle",
  });
  const [openRouterFreeOnly, setOpenRouterFreeOnly] = useState(false);
  const [openRouterQuery, setOpenRouterQuery] = useState("");

  // baseUrl'i debounce'lu tut: kullanıcı Base URL kutusuna elle yazarken
  // her tuş vuruşunda yeniden fetch atmasın (useLocalLlmProbe.ts'teki
  // "yerel sunucu ya hemen yanıtlar ya hiç" dersiyle aynı aile — burada
  // hedef debounce, probe'daki interval değil).
  const [debouncedBaseUrl, setDebouncedBaseUrl] = useState(baseUrl);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedBaseUrl(baseUrl), 400);
    return () => clearTimeout(id);
  }, [baseUrl]);

  useEffect(() => {
    if (mode !== "openai" || preset !== "ollama") {
      // Idempotent: zaten idle ise aynı state'i yeni bir nesne olarak
      // yazma (useLocalLlmProbe.ts'teki aynı ders — burada bu dosyanın iki
      // diğer canlı-liste effect'inde de tekrarlanan bir kalıp).
      setOllamaState((p) => (p.status === "idle" ? p : { status: "idle" }));
      return;
    }
    const ctrl = new AbortController();
    setOllamaState({ status: "loading" });
    fetchOllamaTags(debouncedBaseUrl || CATALOG.ollama.baseUrl, ctrl.signal)
      .then((tags) => {
        if (!ctrl.signal.aborted) setOllamaState({ status: "ok", data: tags });
      })
      .catch((err: unknown) => {
        if (!ctrl.signal.aborted) {
          setOllamaState({
            status: "error",
            message: err instanceof Error ? err.message : "fetch failed",
          });
        }
      });
    return () => ctrl.abort();
  }, [mode, preset, debouncedBaseUrl]);

  useEffect(() => {
    if (mode !== "openai" || preset !== "openrouter") {
      setOpenRouterState((p) => (p.status === "idle" ? p : { status: "idle" }));
      return;
    }
    const ctrl = new AbortController();
    setOpenRouterState({ status: "loading" });
    fetchOpenRouterModels(ctrl.signal)
      .then((list) => {
        if (!ctrl.signal.aborted) setOpenRouterState({ status: "ok", data: list });
      })
      .catch((err: unknown) => {
        if (!ctrl.signal.aborted) {
          setOpenRouterState({
            status: "error",
            message: err instanceof Error ? err.message : "fetch failed",
          });
        }
      });
    return () => ctrl.abort();
    // OpenRouter kataloğu base URL'e bağlı değil (sabit public uç) — yalnız
    // preset/mod'a bağlı, gereksiz yeniden-fetch olmasın diye baseUrl dep
    // listesinde YOK.
  }, [mode, preset]);

  useEffect(() => {
    if (mode !== "openai" || preset !== "bridge") {
      setBridgeBackend((p) => (p.status === "idle" ? p : { status: "idle" }));
      return;
    }
    const ctrl = new AbortController();
    setBridgeBackend({ status: "loading" });
    (async () => {
      try {
        const res = await fetch(
          `${(debouncedBaseUrl || CATALOG.bridge.baseUrl).replace(/\/v1\/?$/, "")}/v1/models`,
          { signal: ctrl.signal, cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { data?: { id?: string }[] };
        const backend = body.data?.[0]?.id;
        if (!ctrl.signal.aborted) {
          if (backend) setBridgeBackend({ status: "ok", data: backend });
          else setBridgeBackend({ status: "error", message: "empty" });
        }
      } catch (err) {
        if (!ctrl.signal.aborted) {
          setBridgeBackend({
            status: "error",
            message: err instanceof Error ? err.message : "fetch failed",
          });
        }
      }
    })();
    return () => ctrl.abort();
  }, [mode, preset, debouncedBaseUrl]);

  // Ollama datalist: katalogdaki üç öneri + gerçekten indirilmiş tag'ler,
  // tekilleştirilmiş — kullanıcı hem "önerilen" hem "elimde olan" arasından
  // seçebilsin.
  const ollamaDatalist = useMemo(() => {
    const pulled = ollamaState.status === "ok" ? ollamaState.data.map((t) => t.name) : [];
    const suggested = Object.values(CATALOG.ollama.defaultModels);
    return Array.from(new Set([...pulled, ...suggested])).sort();
  }, [ollamaState]);

  const openRouterFiltered = useMemo(() => {
    if (openRouterState.status !== "ok") return [];
    let list = openRouterState.data;
    if (openRouterFreeOnly) list = list.filter((m) => m.free);
    const q = openRouterQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
      );
    }
    // Kesme (slice) YOK: tam liste ~340 — datalist için önemsiz bir sayı.
    // Kesilseydi, model kutusuna doğrudan yazan kullanıcı için tarayıcının
    // native datalist filtresi kesimin ARKASINDAKİ modelleri hiç göremezdi
    // (arama kutusu ayrıca daraltmadıkça) — keşfedilebilirlik deliği olurdu.
    return list;
  }, [openRouterState, openRouterFreeOnly, openRouterQuery]);

  // "Test et"in yakacağı gerçek çağrıdan önce ucuz doğrulama. YALNIZ
  // POZİTİF YOKLUKTA bloklar: liste başarıyla yüklendi VE model o listede
  // kesin yok. Yükleniyor/hata/boş liste durumunda testi ASLA engelleme —
  // useLocalLlmProbe.ts'teki "probe sonucu Test'i asla kilitlemez" kuralının
  // aynısı: algılama yanılınca kullanıcının önü kapanmamalı.
  //
  // Yalnız FAST tier kontrol edilir: llmTest() (client-api.ts + statik
  // browser-provider ikisi de) canary çağrısını `tier: "fast"` ile atar —
  // balanced/deep hiç çalışmaz. Üçünü de kontrol etmek, "Ollama" seçilince
  // varsayılan üçlünün (qwen2.5:7b/14b/32b) HEPSİNİN inmiş olmasını
  // isterdi; normal kullanıcı yalnız birini indirmişken (genelde 7b) test
  // düğmesi asla açılmazdı — ticket'ın çözmeye çalıştığı "cryptic patlıyor"
  // sorunundan beter bir kilit. Balanced/deep için bilgilendirici
  // "indirilmemiş" notu yine gösterilir (aşağıdaki JSX), sadece testi
  // bloklamaz.
  const testBlockReason = useMemo((): string | null => {
    if (mode !== "openai") return null;
    const fastId = models.fast;
    if (!fastId) return null;
    if (preset === "ollama" && ollamaState.status === "ok") {
      if (!ollamaTagIsPulled(fastId, ollamaState.data)) {
        return t.testBlockedOllama(fastId);
      }
    }
    if (preset === "openrouter" && openRouterState.status === "ok") {
      const known = new Set(openRouterState.data.map((m) => m.id));
      if (!known.has(fastId)) return t.testBlockedOpenRouter(fastId);
    }
    return null;
  }, [mode, preset, models.fast, ollamaState, openRouterState, t]);

  const save = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await llmConfigPut({
        mode,
        // anthropic'te baseUrl boşsa katalog adresine düş. switchMode zaten
        // dolduruyor ama o yalnız kullanıcı modu ELLE değiştirince çalışır;
        // boş baseUrl'lü eski bir config'i yükleyip doğrudan Kaydet'e basan
        // kullanıcı yine llmConfigured() === false ile baş başa kalırdı.
        baseUrl:
          mode === "anthropic"
            ? baseUrl || CATALOG.anthropic.baseUrl
            : baseUrl || undefined,
        // Boş input = kayıtlı anahtarı koru (iki tarafta da böyle).
        apiKey: apiKey || undefined,
        models:
          models.fast || models.balanced || models.deep
            ? {
                fast: models.fast || undefined,
                balanced: models.balanced || undefined,
                deep: models.deep || undefined,
              }
            : undefined,
        jsonMode: mode === "openai" ? jsonMode : undefined,
      });
      setSaveMsg(t.saved);
      setApiKey("");
      invalidateLlmStatus();
      hydrate(await llmConfigGet());
      onSaved?.();
    } catch {
      setSaveMsg(t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    // Ucuz doğrulama önce: seçili model canlı listede kesin yoksa gerçek
    // LLM çağrısı hiç atılmaz. Not: llmTest() KAYDEDİLMİŞ config'i test
    // eder, bu kontrol EKRANDAKİ formu okur — ikisi ayrışabilir (henüz
    // Kaydet'e basılmamış olabilir), o yüzden mesaj "test başarısız olurdu"
    // değil "ekrandaki model listede yok" der.
    if (testBlockReason) {
      setTestMsg(`⚠️ ${t.testBlockedTitle}: ${testBlockReason}`);
      return;
    }
    setTesting(true);
    setTestMsg(null);
    try {
      const body = await llmTest();
      setTestMsg(
        body.ok
          ? t.testOk(((body.ms ?? 0) / 1000).toFixed(1))
          : `❌ ${body.error ?? t.testFailed}`
      );
    } catch {
      setTestMsg(t.serverUnreachable);
    } finally {
      setTesting(false);
    }
  };

  if (!config) return null;

  const modeOptions: { value: Mode; label: string; desc: string }[] = [
    ...(config.cliAllowed
      ? [{ value: "cli" as Mode, label: t.modeCli, desc: t.modeCliDesc }]
      : []),
    { value: "openai", label: t.modeOpenai, desc: t.modeOpenaiDesc },
    { value: "anthropic", label: t.modeAnthropic, desc: t.modeAnthropicDesc },
    { value: "none", label: t.modeNone, desc: t.modeNoneDesc },
  ];

  // Yerel hedefler (köprü/Ollama/LM Studio) anahtar istemez — alanı hiç
  // gösterme. "custom"da göster: bilinmeyen endpoint isteyebilir.
  const needsKeyField =
    mode === "anthropic" ||
    (mode === "openai" && (CATALOG[preset].needsKey || preset === "custom"));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-ink-soft">{t.desc}</p>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          {t.mode}
        </span>
        {modeOptions.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-2.5 transition-colors ${
              mode === opt.value
                ? "border-indigo bg-indigo-soft/40"
                : "border-surface-2 bg-background hover:border-indigo-soft"
            }`}
          >
            <input
              type="radio"
              name="llm-mode"
              checked={mode === opt.value}
              onChange={() => switchMode(opt.value)}
              className="mt-1 accent-[var(--color-indigo)]"
            />
            <span>
              <span className="block text-sm font-semibold">{opt.label}</span>
              <span className="block text-xs text-ink-soft">{opt.desc}</span>
            </span>
          </label>
        ))}
      </div>

      {mode === "cli" && (
        <p className="text-xs text-ink-soft">
          {t.cliHintBefore}{" "}
          <code className="rounded bg-surface-2 px-1.5">claude</code>{" "}
          {t.cliHintAfter}
        </p>
      )}

      {mode === "openai" && (
        <div className="flex flex-col gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-semibold">{t.preset}</span>
            <select
              value={preset}
              onChange={(e) => applyPreset(e.target.value as HttpProviderId)}
              className="w-full rounded-xl border-2 border-surface-2 bg-background px-3 py-2 outline-none focus:border-indigo focus:ring-4 focus:ring-indigo/15"
            >
              {HTTP_PROVIDER_IDS.map((id) => (
                <option key={id} value={id}>
                  {CATALOG[id].label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">{t.baseUrl}</span>
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.deepseek.com/v1"
              className={inputCls}
            />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={jsonMode}
              onChange={(e) => setJsonMode(e.target.checked)}
              className="mt-1 accent-[var(--color-indigo)]"
            />
            <span>
              <span className="block font-semibold">{t.jsonMode}</span>
              <span className="block text-xs text-ink-soft">
                {t.jsonModeHint}
              </span>
            </span>
          </label>
        </div>
      )}

      {(mode === "openai" || mode === "anthropic") && (
        <div className="flex flex-col gap-3">
          {needsKeyField && (
            <label className="text-sm">
              <span className="mb-1 block font-semibold">{t.apiKey}</span>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={config.hasKey ? config.apiKeyMasked : "sk-..."}
                className={inputCls}
              />
              {config.hasKey && (
                <span className="mt-1 block text-xs text-ink-soft">
                  {t.apiKeyKept}
                </span>
              )}
            </label>
          )}
          <div className="text-sm">
            <span className="mb-1 block font-semibold">{t.models}</span>
            <div className="grid grid-cols-3 gap-2">
              {(["fast", "balanced", "deep"] as const).map((tier) => (
                <input
                  key={tier}
                  value={models[tier]}
                  onChange={(e) =>
                    setModels((m) => ({ ...m, [tier]: e.target.value }))
                  }
                  placeholder={
                    tier === "fast"
                      ? t.modelFast
                      : tier === "balanced"
                        ? t.modelBalanced
                        : t.modelDeep
                  }
                  list={
                    mode === "openai" && preset === "ollama"
                      ? "t061-ollama-models"
                      : mode === "openai" && preset === "openrouter"
                        ? "t061-openrouter-models"
                        : undefined
                  }
                  className="w-full rounded-xl border-2 border-surface-2 bg-background px-2 py-2 font-mono text-xs outline-none focus:border-indigo focus:ring-4 focus:ring-indigo/15"
                />
              ))}
            </div>
            <span className="mt-1 block text-xs text-ink-soft">
              {mode === "openai" && preset === "bridge"
                ? t.modelsBridgeHint
                : t.modelsHint}
            </span>

            {/* T-061: canlı model listeleri — yalnız openai modunda ve
                ilgili preset'te; datalist native tarayıcı typeahead'i
                verir, elle yazmayı da bozmaz. */}
            {mode === "openai" && preset === "ollama" && (
              <>
                <datalist id="t061-ollama-models">
                  {ollamaDatalist.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                <div className="mt-2 text-xs text-ink-soft">
                  {ollamaState.status === "loading" && t.ollamaLoading}
                  {ollamaState.status === "error" && t.ollamaError}
                  {ollamaState.status === "ok" && (
                    <span>{t.ollamaCount(ollamaState.data.length)}</span>
                  )}
                </div>
                {ollamaState.status === "ok" &&
                  (() => {
                    // Boş alan "katalog varsayılanına düş" demektir, "boş
                    // string'i indir" değil — ollamaTagIsPulled("", …)
                    // false döndüğü için tier boşsa hiç değerlendirme.
                    const unpulledTier = (id: string) =>
                      id && !ollamaTagIsPulled(id, ollamaState.data) ? id : "";
                    const unpulled = {
                      fast: unpulledTier(models.fast),
                      balanced: unpulledTier(models.balanced),
                      deep: unpulledTier(models.deep),
                    };
                    if (!unpulled.fast && !unpulled.balanced && !unpulled.deep) {
                      return null;
                    }
                    // ollamaPullCommand (llm-setup-logic.ts) tekilleştirip
                    // "&&" ile zincirler — üç ayrı paragraf yerine tek
                    // kopyala-yapıştır komutu.
                    return (
                      <p className="mt-1 text-xs text-ink-soft">
                        {t.ollamaNotPulled}{" "}
                        <code className="rounded bg-surface-2 px-1.5">
                          {ollamaPullCommand(unpulled)}
                        </code>
                      </p>
                    );
                  })()}
              </>
            )}

            {mode === "openai" && preset === "openrouter" && (
              <>
                <datalist id="t061-openrouter-models">
                  {openRouterFiltered.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </datalist>
                <div className="mt-2 flex flex-col gap-1.5 text-xs text-ink-soft">
                  {openRouterState.status === "loading" && (
                    <span>{t.openRouterLoading}</span>
                  )}
                  {openRouterState.status === "error" && (
                    <span>{t.openRouterError}</span>
                  )}
                  {openRouterState.status === "ok" && (
                    <>
                      <span>{t.openRouterCount(openRouterState.data.length)}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={openRouterQuery}
                          onChange={(e) => setOpenRouterQuery(e.target.value)}
                          placeholder={t.openRouterSearch}
                          className="rounded-lg border-2 border-surface-2 bg-background px-2 py-1 text-xs outline-none focus:border-indigo"
                        />
                        <label className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={openRouterFreeOnly}
                            onChange={(e) => setOpenRouterFreeOnly(e.target.checked)}
                            className="accent-[var(--color-indigo)]"
                          />
                          {t.openRouterFreeOnly}
                        </label>
                      </div>
                      {(["fast", "balanced", "deep"] as const)
                        .map((tier) => ({ tier, id: models[tier] }))
                        .filter((m) => m.id)
                        .map(({ tier, id }) => {
                          const found = openRouterState.data.find((m) => m.id === id);
                          if (!found) {
                            return (
                              <p key={tier} className="text-xs text-ink-soft">
                                {t.openRouterNotListed(id)}
                              </p>
                            );
                          }
                          const price = formatOpenRouterPrice(found);
                          return (
                            <p key={tier} className="text-xs text-ink-soft">
                              {t.openRouterPrice(
                                id,
                                found.free
                                  ? t.openRouterFree
                                  : (price ?? t.openRouterUnknownPrice)
                              )}
                            </p>
                          );
                        })}
                    </>
                  )}
                </div>
              </>
            )}

            {mode === "openai" && preset === "bridge" && (
              <div className="mt-2 text-xs text-ink-soft">
                {bridgeBackend.status === "loading" && t.bridgeBackendLoading}
                {bridgeBackend.status === "error" && t.bridgeBackendError}
                {bridgeBackend.status === "ok" &&
                  t.bridgeBackendFound(bridgeBackend.data)}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <CozyButton variant="soft" onClick={save} disabled={saving}>
          {saving ? t.saving : t.save}
        </CozyButton>
        <CozyButton variant="ghost" onClick={test} disabled={testing}>
          {testing ? t.testing : t.test}
        </CozyButton>
        {saveMsg && <span className="text-sm">{saveMsg}</span>}
      </div>
      {testMsg && <p className="text-sm">{testMsg}</p>}
    </div>
  );
}
