"use client";

// Tarayıcı LLM sağlayıcısı (statik mod): config localStorage'da, çağrılar
// TARAYICIDAN çıkar — kullanıcının localhost köprüsüne (llm-bridge/Ollama/
// LM Studio) veya kendi API key'iyle buluta (DeepSeek/OpenAI/OpenRouter/
// Anthropic). Sunucu HTTP sağlayıcılarının aynası; retry/extractJson
// semantiği shared-pure'dan, kayıt tarayıcı DB'sindeki llm_calls'a.

import {
  type GenerateJsonOptions,
  type GenerateTextOptions,
  type ModelTier,
  LlmError,
  LlmAuthError,
  LlmTimeoutError,
} from "./provider-types";
import {
  DEFAULT_TIMEOUT_MS,
  runJsonWithRetry,
  schemaToJsonSchema,
} from "./shared-pure";
import type { Gen } from "@/core/llm-gen";

const LS_KEY = "llm-browser-config";

export interface BrowserLlmConfig {
  mode: "openai" | "anthropic" | "none";
  baseUrl?: string;
  apiKey?: string;
  models?: { fast?: string; balanced?: string; deep?: string };
  jsonMode?: boolean;
}

export function readBrowserLlmConfig(): BrowserLlmConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as BrowserLlmConfig) : null;
  } catch {
    return null;
  }
}

export function writeBrowserLlmConfig(config: BrowserLlmConfig): void {
  localStorage.setItem(LS_KEY, JSON.stringify(config));
}

export function browserLlmConfigured(): boolean {
  const c = readBrowserLlmConfig();
  if (!c || c.mode === "none") return false;
  if (c.mode === "openai") return Boolean(c.baseUrl);
  return Boolean(c.apiKey); // anthropic
}

function modelFor(c: BrowserLlmConfig, tier: ModelTier): string {
  return c.models?.[tier] || tier;
}

// Aynı anda tek LLM çağrısı (köprü/abonelik limitleri; urgent öne geçer).
let active = 0;
const waiters: Array<{ resolve: () => void; urgent: boolean }> = [];
async function enqueue<T>(fn: () => Promise<T>, urgent?: boolean): Promise<T> {
  if (active >= 1) {
    await new Promise<void>((resolve) =>
      waiters.push({ resolve, urgent: urgent ?? false })
    );
  }
  active++;
  try {
    return await fn();
  } finally {
    active--;
    const i = waiters.findIndex((w) => w.urgent);
    (i >= 0 ? waiters.splice(i, 1)[0] : waiters.shift())?.resolve();
  }
}

async function recordBrowserCall(row: {
  purpose: string;
  model: string;
  tier: ModelTier;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
}) {
  try {
    const { getBrowserDb } = await import("@/db/browser");
    const tables = await import("@/db/schema");
    const { db, persistSoon } = await getBrowserDb();
    db.insert(tables.llmCalls)
      .values({ id: crypto.randomUUID(), costUsd: 0, ...row })
      .run();
    persistSoon();
  } catch (err) {
    console.warn("[browser-llm] usage kaydedilemedi:", err);
  }
}

async function callOpenAiCompat(
  c: BrowserLlmConfig,
  opts: {
    prompt: string;
    system?: string;
    tier: ModelTier;
    purpose: string;
    jsonMode: boolean;
    timeoutMs: number;
  }
): Promise<string> {
  const baseUrl = c.baseUrl?.replace(/\/$/, "");
  if (!baseUrl) throw new LlmError("LLM baseUrl ayarlı değil");
  const model = modelFor(c, opts.tier);

  const messages: Array<{ role: string; content: string }> = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: opts.prompt });

  const body: Record<string, unknown> = { model, messages };
  if (opts.jsonMode) body.response_format = { type: "json_object" };

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (c.apiKey) headers.authorization = `Bearer ${c.apiKey}`;

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new LlmTimeoutError(`LLM çağrısı ${opts.timeoutMs / 1000}s içinde bitmedi`);
    }
    throw new LlmError(
      `LLM sunucusuna ulaşılamadı: ${err instanceof Error ? err.message : String(err)} — köprü/Ollama çalışıyor mu, origin izinli mi?`
    );
  }
  clearTimeout(timer);

  const text = await res.text();
  if (res.status === 401 || res.status === 403) {
    throw new LlmAuthError("LLM sağlayıcısı kimliği reddetti — API anahtarını kontrol et.", text);
  }
  if (!res.ok) throw new LlmError(`LLM sunucusu hata verdi (HTTP ${res.status})`, text);

  let data: {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    error?: { message?: string };
  };
  try {
    data = JSON.parse(text);
  } catch {
    throw new LlmError("LLM yanıtı JSON değil", text);
  }
  if (data.error) throw new LlmError(`LLM hata döndürdü: ${data.error.message ?? "?"}`, text);
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new LlmError("LLM yanıtında içerik yok", text);

  console.log(
    `[llm] provider=browser-openai host=${new URL(baseUrl).host} model=${model} tier=${opts.tier} purpose=${opts.purpose} ${((Date.now() - started) / 1000).toFixed(1)}s`
  );
  void recordBrowserCall({
    purpose: opts.purpose,
    model,
    tier: opts.tier,
    durationMs: Date.now() - started,
    inputTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
  });
  return content;
}

async function callAnthropic(
  c: BrowserLlmConfig,
  opts: {
    prompt: string;
    system?: string;
    tier: ModelTier;
    purpose: string;
    timeoutMs: number;
  }
): Promise<string> {
  const baseUrl = c.baseUrl?.replace(/\/$/, "") || "https://api.anthropic.com/v1";
  const model = modelFor(c, opts.tier);
  if (!c.apiKey) throw new LlmError("Anthropic API anahtarı ayarlı değil");

  const body: Record<string, unknown> = {
    model,
    max_tokens: 8192,
    messages: [{ role: "user", content: opts.prompt }],
  };
  if (opts.system) body.system = opts.system;

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": c.apiKey,
        "anthropic-version": "2023-06-01",
        // Tarayıcıdan doğrudan çağrı için Anthropic'in CORS opt-in başlığı.
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new LlmTimeoutError(`LLM çağrısı ${opts.timeoutMs / 1000}s içinde bitmedi`);
    }
    throw new LlmError(
      `Anthropic'e ulaşılamadı: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  clearTimeout(timer);

  const text = await res.text();
  if (res.status === 401 || res.status === 403) {
    throw new LlmAuthError("Anthropic kimliği reddetti — API anahtarını kontrol et.", text);
  }
  if (!res.ok) throw new LlmError(`Anthropic hata verdi (HTTP ${res.status})`, text);

  let data: {
    content?: Array<{ type?: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
    error?: { message?: string };
  };
  try {
    data = JSON.parse(text);
  } catch {
    throw new LlmError("Anthropic yanıtı JSON değil", text);
  }
  if (data.error) throw new LlmError(`Anthropic hata döndürdü: ${data.error.message ?? "?"}`, text);
  const out = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  if (!out) throw new LlmError("Anthropic yanıtında metin yok", text);

  console.log(
    `[llm] provider=browser-anthropic model=${model} tier=${opts.tier} purpose=${opts.purpose} ${((Date.now() - started) / 1000).toFixed(1)}s`
  );
  void recordBrowserCall({
    purpose: opts.purpose,
    model,
    tier: opts.tier,
    durationMs: Date.now() - started,
    inputTokens: data.usage?.input_tokens,
    outputTokens: data.usage?.output_tokens,
  });
  return out;
}

function callOnce(
  c: BrowserLlmConfig,
  opts: {
    prompt: string;
    system?: string;
    tier: ModelTier;
    purpose: string;
    jsonMode: boolean;
    timeoutMs: number;
  }
): Promise<string> {
  return c.mode === "anthropic" ? callAnthropic(c, opts) : callOpenAiCompat(c, opts);
}

/** Aktif tarayıcı sağlayıcısı — config yoksa null (çağıran gate'ler). */
export function getBrowserGen(): Gen | null {
  if (!browserLlmConfigured()) return null;
  return {
    async generateJson<T>(opts: GenerateJsonOptions<T>): Promise<T> {
      const c = readBrowserLlmConfig()!;
      const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const schemaHint = `\n\nÇıktın SADECE şu JSON şemasına uyan geçerli bir JSON olmalı:\n${JSON.stringify(
        schemaToJsonSchema(opts.schema)
      )}`;
      return enqueue(
        () =>
          runJsonWithRetry(opts, (prompt, isRetry) =>
            callOnce(c, {
              prompt: prompt + (isRetry ? "" : schemaHint),
              system: opts.system,
              tier: opts.tier,
              purpose: isRetry ? `${opts.fixtureKey}-retry` : opts.fixtureKey,
              jsonMode: c.jsonMode ?? false,
              timeoutMs,
            })
          ),
        opts.urgent
      );
    },
    async generateText(opts: GenerateTextOptions): Promise<string> {
      const c = readBrowserLlmConfig()!;
      const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      return enqueue(
        () =>
          callOnce(c, {
            prompt: opts.prompt,
            system: opts.system,
            tier: opts.tier,
            purpose: opts.fixtureKey,
            jsonMode: false,
            timeoutMs,
          }),
        opts.urgent
      );
    },
  };
}
