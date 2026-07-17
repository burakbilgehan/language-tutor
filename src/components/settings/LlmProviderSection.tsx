"use client";

import { useEffect, useState } from "react";
import { CozyButton } from "@/components/shared/CozyButton";
import { useStrings } from "@/lib/i18n/use-strings";
import { invalidateLlmStatus } from "@/lib/llm-status";
import { PRESET_LIST, PRESETS, type PresetId } from "@/lib/llm/presets";

const S = {
  tr: {
    title: "LLM Sağlayıcı",
    desc: "İçerik üretimi ve değerlendirme için hangi LLM kullanılacak. API anahtarın yalnızca bu cihazdaki yapılandırma dosyasında tutulur — kayıt (save) dosyasına asla girmez.",
    modeCli: "Claude CLI (Max aboneliği)",
    modeCliDesc: "Bu makinedeki `claude` girişini kullanır.",
    modeOpenai: "API / Yerel sunucu (OpenAI uyumlu)",
    modeOpenaiDesc: "DeepSeek, OpenAI, OpenRouter, Ollama, LM Studio...",
    modeAnthropic: "Anthropic API anahtarı",
    modeAnthropicDesc: "console.anthropic.com'dan alınan anahtar.",
    modeNone: "Kapalı",
    modeNoneDesc: "LLM yok — yalnızca hazır (cache'li) içerik çalışır.",
    preset: "Sağlayıcı",
    baseUrl: "Base URL",
    apiKey: "API anahtarı",
    apiKeyKept: "Kayıtlı anahtar korunur — değiştirmek için yenisini yaz.",
    models: "Modeller (hızlı / dengeli / derin)",
    modelFast: "Hızlı",
    modelBalanced: "Dengeli",
    modelDeep: "Derin",
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
    title: "LLM Provider",
    desc: "Which LLM to use for content generation and grading. Your API key is kept only in this device's config file — it never enters a save file.",
    modeCli: "Claude CLI (Max subscription)",
    modeCliDesc: "Uses the `claude` login on this machine.",
    modeOpenai: "API / Local server (OpenAI-compatible)",
    modeOpenaiDesc: "DeepSeek, OpenAI, OpenRouter, Ollama, LM Studio...",
    modeAnthropic: "Anthropic API key",
    modeAnthropicDesc: "A key from console.anthropic.com.",
    modeNone: "Off",
    modeNoneDesc: "No LLM — only already-generated (cached) content works.",
    preset: "Provider",
    baseUrl: "Base URL",
    apiKey: "API key",
    apiKeyKept: "The stored key is kept — type a new one to replace it.",
    models: "Models (fast / balanced / deep)",
    modelFast: "Fast",
    modelBalanced: "Balanced",
    modelDeep: "Deep",
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

interface ConfigDto {
  mode: Mode;
  baseUrl?: string;
  apiKeyMasked?: string;
  hasKey: boolean;
  models?: { fast?: string; balanced?: string; deep?: string };
  jsonMode?: boolean;
  concurrency?: number;
  cliAllowed: boolean;
}

const ANTHROPIC_DEFAULT_MODELS = {
  fast: "claude-haiku-4-5",
  balanced: "claude-sonnet-4-6",
  deep: "claude-opus-4-6",
};

export function LlmProviderSection() {
  const t = useStrings(S);
  const [config, setConfig] = useState<ConfigDto | null>(null);
  const [mode, setMode] = useState<Mode>("cli");
  const [preset, setPreset] = useState<PresetId>("ollama");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState({ fast: "", balanced: "", deep: "" });
  const [jsonMode, setJsonMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/llm-config")
      .then((r) => r.json())
      .then((d: ConfigDto) => {
        setConfig(d);
        setMode(d.mode);
        setBaseUrl(d.baseUrl ?? "");
        setModels({
          fast: d.models?.fast ?? "",
          balanced: d.models?.balanced ?? "",
          deep: d.models?.deep ?? "",
        });
        setJsonMode(d.jsonMode ?? false);
        // Match the stored baseUrl back to a preset for the dropdown.
        const match = PRESET_LIST.find(
          (p) => p.baseUrl && p.baseUrl === d.baseUrl
        );
        if (match) setPreset(match.id);
        else if (d.baseUrl) setPreset("custom");
      })
      .catch(() => {});
  }, []);

  const applyPreset = (id: PresetId) => {
    setPreset(id);
    const p = PRESETS[id];
    if (p.baseUrl) setBaseUrl(p.baseUrl);
    setModels({ ...p.models });
    setJsonMode(p.jsonMode);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setSaveMsg(null);
    if (m === "anthropic") {
      setBaseUrl("");
      setModels((prev) =>
        prev.fast || prev.balanced || prev.deep
          ? prev
          : { ...ANTHROPIC_DEFAULT_MODELS }
      );
    }
    if (m === "openai" && !baseUrl) applyPreset(preset);
  };

  const save = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/llm-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          baseUrl: baseUrl || undefined,
          // Empty input = keep the stored key (server preserves it).
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
        }),
      });
      if (!res.ok) throw new Error();
      setSaveMsg(t.saved);
      setApiKey("");
      invalidateLlmStatus();
      // Refresh masked-key display.
      const d: ConfigDto = await (await fetch("/api/llm-config")).json();
      setConfig(d);
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
      const res = await fetch("/api/health/llm", { method: "POST" });
      const body = await res.json();
      setTestMsg(
        body.ok
          ? t.testOk((body.ms / 1000).toFixed(1))
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

  const needsKeyField = mode === "openai" || mode === "anthropic";

  return (
    <section className="rounded-cozy bg-surface p-6 shadow-cozy">
      <h2 className="mb-1 font-semibold">{t.title}</h2>
      <p className="mb-4 text-sm text-ink-soft">{t.desc}</p>

      <div className="flex flex-col gap-2">
        {modeOptions.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 px-4 py-3 transition-colors ${
              mode === opt.value
                ? "border-accent bg-accent-soft/40"
                : "border-surface-2 bg-background hover:border-accent-soft"
            }`}
          >
            <input
              type="radio"
              name="llm-mode"
              checked={mode === opt.value}
              onChange={() => switchMode(opt.value)}
              className="mt-1 accent-[var(--color-accent)]"
            />
            <span>
              <span className="block text-sm font-semibold">{opt.label}</span>
              <span className="block text-xs text-ink-soft">{opt.desc}</span>
            </span>
          </label>
        ))}
      </div>

      {mode === "cli" && (
        <p className="mt-3 text-xs text-ink-soft">
          {t.cliHintBefore}{" "}
          <code className="rounded bg-surface-2 px-1.5">claude</code>{" "}
          {t.cliHintAfter}
        </p>
      )}

      {mode === "openai" && (
        <div className="mt-4 flex flex-col gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-semibold">{t.preset}</span>
            <select
              value={preset}
              onChange={(e) => applyPreset(e.target.value as PresetId)}
              className="w-full rounded-xl border-2 border-surface-2 bg-background px-3 py-2 outline-none focus:border-accent"
            >
              {PRESET_LIST.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
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
              className="w-full rounded-xl border-2 border-surface-2 bg-background px-3 py-2 font-mono text-xs outline-none focus:border-accent"
            />
          </label>
        </div>
      )}

      {needsKeyField && (
        <div className="mt-3 flex flex-col gap-3">
          <label className="text-sm">
            <span className="mb-1 block font-semibold">{t.apiKey}</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config.hasKey ? config.apiKeyMasked : "sk-..."}
              className="w-full rounded-xl border-2 border-surface-2 bg-background px-3 py-2 font-mono text-xs outline-none focus:border-accent"
            />
            {config.hasKey && (
              <span className="mt-1 block text-xs text-ink-soft">
                {t.apiKeyKept}
              </span>
            )}
          </label>
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
                  className="w-full rounded-xl border-2 border-surface-2 bg-background px-2 py-2 font-mono text-xs outline-none focus:border-accent"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <CozyButton variant="soft" onClick={save} disabled={saving}>
          {saving ? t.saving : t.save}
        </CozyButton>
        <CozyButton variant="ghost" onClick={test} disabled={testing}>
          {testing ? t.testing : t.test}
        </CozyButton>
        {saveMsg && <span className="text-sm">{saveMsg}</span>}
      </div>
      {testMsg && <p className="mt-3 text-sm">{testMsg}</p>}
    </section>
  );
}
