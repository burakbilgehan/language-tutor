"use client";

// T-060/4: eski LlmProviderSection'ın erimiş hâli. Ayrı bir "LLM Sağlayıcı"
// yüzeyi değil, sihirbazın içindeki "Gelişmiş" accordion'ının gövdesi:
// nokta atışı model id'leri, custom base URL, jsonMode, ekstra backend'ler,
// ve CLI modu (server-mode, sahibin kullanımı) aynen burada.
//
// Kasıtlı olarak KENDİ dosyasında ve dar arayüzlü: T-061 (canlı model
// listeleri) buraya bağlanacak, T-063 (bağlantı durumu kartı) sihirbaz
// kabuğuna — ikisi birbirine çarpmasın.

import { useEffect, useState } from "react";
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
import { BRIDGE_SENTINEL_TRIPLE } from "./llm-setup-logic";

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
                  className="w-full rounded-xl border-2 border-surface-2 bg-background px-2 py-2 font-mono text-xs outline-none focus:border-indigo focus:ring-4 focus:ring-indigo/15"
                />
              ))}
            </div>
            <span className="mt-1 block text-xs text-ink-soft">
              {mode === "openai" && preset === "bridge"
                ? t.modelsBridgeHint
                : t.modelsHint}
            </span>
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
