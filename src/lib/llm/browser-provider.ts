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
  LlmCancelledError,
} from "./provider-types";
import {
  DEFAULT_TIMEOUT_MS,
  runJsonWithRetry,
  schemaToJsonSchema,
} from "./shared-pure";
import { resolveModelId, providerForBaseUrl, type ProviderId } from "./catalog";
import { enqueueLlmCall } from "./browser-queue";
import type { Gen } from "@/core/llm-gen";

const LS_KEY = "llm-browser-config";

/** Köprünün kendi CLI süresi istemcininkinden bu kadar kısa tutulur: köprü
 * önce düşsün ki yapılandırılmış 504 (type:"timeout") istemciye ULAŞSIN.
 * Aksi halde AbortController yarışı kazanır ve elimizde teşhissiz bir abort
 * kalır. */
const BRIDGE_TIMEOUT_MARGIN_MS = 15_000;

/** Bu eşiğin ALTINDAKİ çağrılara köprü zaman aşımı GÖNDERİLMEZ: kısa
 * çağrılar (translate 30s, grading 60s) köprünün kendi tavanının altında
 * zaten bitiyor; onlara tavan göndermek yalnızca daraltır. Eşik, tek uzun
 * üretim yolu olan ders/müfredat (300s) ile arasındaki boşluğa oturur. */
const BRIDGE_TIMEOUT_MIN_REQUEST_MS = 120_000;

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

/** No process.env in the browser bundle — config only, then the catalog
 * default for the matched provider (mode:"anthropic" or a baseUrl-matched
 * HTTP preset). Throws when unresolved (T-057: a literal tier string like
 * "fast" must never reach a real API as a model id). */
function modelFor(c: BrowserLlmConfig, tier: ModelTier): string {
  const providerId: ProviderId =
    c.mode === "anthropic" ? "anthropic" : (providerForBaseUrl(c.baseUrl) ?? "custom");
  return resolveModelId({ tier, configModels: c.models, provider: providerId });
}

// Aynı anda tek LLM çağrısı: kuyruk browser-queue.ts'te (saf + test edilebilir,
// bu dosya "use client"/localStorage bağımlı olduğu için oradan ayrıldı).
const enqueue = enqueueLlmCall;

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

/** Çağıranın iptal sinyalini sağlayıcının timeout controller'ına bağlar ve
 * sökme fonksiyonunu döner. AYRI bir controller kurulmaz: fetch tek signal
 * alır, ikisini birleştirmenin yolu budur. Dinleyici her çıkışta sökülür,
 * yoksa uzun ömürlü bir signal'e (aynı derste birden çok çağrı) dinleyici
 * birikirdi. */
function attachCallerSignal(
  controller: AbortController,
  caller: AbortSignal | undefined
): () => void {
  if (!caller) return () => {};
  if (caller.aborted) {
    controller.abort();
    return () => {};
  }
  const onAbort = () => controller.abort();
  caller.addEventListener("abort", onAbort, { once: true });
  return () => caller.removeEventListener("abort", onAbort);
}

/** 504 gövdesi köprünün zaman aşımı zarfı mı? Yalnız yapılandırılmış alan
 * (`error.type === "timeout"`) sayılır; başka bir vekil/proxy'nin düz 504'ü
 * bu yola girmez. */
function bridgeTimeoutBody(text: string): boolean {
  try {
    const parsed = JSON.parse(text) as { error?: { type?: string } };
    return parsed?.error?.type === "timeout";
  } catch {
    return false;
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
    signal?: AbortSignal;
    label?: string;
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
  // T-070-A: yerel köprüye istek başına CLI zaman aşımı geçir. Köprünün eski
  // 180s varsayılanı ders üretiminin süre dağılımının içindeydi (her ~5
  // dersten biri SIGKILL). Neden GÖVDE, başlık değil: özel bir başlık
  // cross-origin preflight'ta eski köprülerin allow-headers listesinde
  // olmadığı için isteği tarayıcıda tamamen öldürürdü; bilinmeyen gövde alanı
  // ise sessizce yok sayılır (iki sürümle de doğrulandı). Yalnız köprü
  // baseUrl'ine: gerçek OpenAI uçları katı şema doğrulamasında 400 verebilir.
  // Köprü tarafı bizim istediğimizden ÖNCE düşmeli, yoksa istemcinin
  // AbortController'ı yarışı kazanır ve yapılandırılmış 504 hiç görünmez.
  // YALNIZ uzun üretimler için: kısa çağrılar (translate 30s, grading 60s)
  // köprünün kendi --timeout tavanının altında zaten rahatça bitiyordu.
  // Onlara da bir tavan göndermek, köprünün CLI'sını uygulamanın 30s'inden
  // 15s'e indirir; üstelik bunun sonucu olan zaman aşımı mesajı kullanıcıya
  // "--timeout 600 ile başlat" der ve bu HİÇBİR ŞEYİ değiştirmez (sınırı biz
  // koymuş oluruz). Yavaş yerel modellerde net bir davranış gerilemesi.
  if (
    providerForBaseUrl(baseUrl) === "bridge" &&
    opts.timeoutMs > BRIDGE_TIMEOUT_MIN_REQUEST_MS
  ) {
    body.bridge_timeout_ms = opts.timeoutMs - BRIDGE_TIMEOUT_MARGIN_MS;
  }
  // Köprü şeffaflığı: log satırları "model=sonnet 187s" yerine NE üretildiğini
  // söylesin. Yalnız köprüye gider; gerçek OpenAI uçları bilinmeyen alanda 400
  // verebilir diye timeout alanıyla aynı gate'in arkasında.
  if (providerForBaseUrl(baseUrl) === "bridge") {
    body.bridge_label = opts.label ?? opts.purpose;
  }

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (c.apiKey) headers.authorization = `Bearer ${c.apiKey}`;

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  // T-070-C: kullanıcının iptali sağlayıcının kendi timeout controller'ını
  // DEĞİŞTİRMEZ, ona bağlanır. Abort sebebi ayırt edilir: iptalde
  // LlmTimeoutError atmak, kullanıcının durdurduğu üretimi "çok uzun sürdü"
  // diye raporlamak olurdu.
  const detachCaller = attachCallerSignal(controller, opts.signal);
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
    detachCaller();
    if (err instanceof Error && err.name === "AbortError") {
      if (opts.signal?.aborted) throw new LlmCancelledError();
      throw new LlmTimeoutError(`LLM çağrısı ${opts.timeoutMs / 1000}s içinde bitmedi`);
    }
    throw new LlmError(
      `LLM sunucusuna ulaşılamadı: ${err instanceof Error ? err.message : String(err)} — köprü/Ollama çalışıyor mu, origin izinli mi?`
    );
  }
  clearTimeout(timer);
  detachCaller();

  const text = await res.text();
  if (res.status === 401 || res.status === 403) {
    throw new LlmAuthError("LLM sağlayıcısı kimliği reddetti — API anahtarını kontrol et.", text);
  }
  // T-070-A: köprünün "CLI'yı ben öldürdüm" yanıtı. Yapılandırılmış tip
  // okunur, mesaj metni AYIKLANMAZ (llm-diagnosis.ts'in kuralı: sağlayıcı
  // metnine göre karar verme, sessizce kayar). Eski köprü bunu asla
  // göndermez; orada davranış eskisi gibi generic LlmError kalır.
  if (res.status === 504 && bridgeTimeoutBody(text)) {
    throw new LlmTimeoutError(
      `Üretim çok uzun sürdüğü için köprü tarafından durduruldu. Daha küçük/hızlı bir model deneyebilir ya da köprüyü daha uzun süreyle başlatabilirsin: node llm-bridge.mjs --timeout 600`,
      text
    );
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
    signal?: AbortSignal;
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
  const detachCaller = attachCallerSignal(controller, opts.signal);
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
    detachCaller();
    if (err instanceof Error && err.name === "AbortError") {
      if (opts.signal?.aborted) throw new LlmCancelledError();
      throw new LlmTimeoutError(`LLM çağrısı ${opts.timeoutMs / 1000}s içinde bitmedi`);
    }
    throw new LlmError(
      `Anthropic'e ulaşılamadı: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  clearTimeout(timer);
  detachCaller();

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
    signal?: AbortSignal;
    label?: string;
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
              signal: opts.signal,
              label: opts.label,
            })
          ),
        opts.urgent,
        { signal: opts.signal, key: opts.queueKey }
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
            signal: opts.signal,
            label: opts.label,
          }),
        opts.urgent,
        { signal: opts.signal, key: opts.queueKey }
      );
    },
  };
}

/** T-066: smoke-test a CANDIDATE config (not the one in localStorage) —
 * static mode's mirror of the server probe route's providerForCandidate().
 * Deliberately calls callOnce(c, ...) directly instead of going through
 * getBrowserGen()/readBrowserLlmConfig(), which only ever see the SAVED
 * config, so the wizard can test before it writes anything to localStorage. */
export async function probeBrowserConfig(
  c: BrowserLlmConfig
): Promise<{ ok: boolean; ms?: number; error?: string }> {
  const started = Date.now();
  try {
    const { z } = await import("zod");
    const result = await runJsonWithRetry(
      {
        system: "Kısa cevap ver.",
        prompt: 'JSON döndür: {"ok": true}',
        schema: z.object({ ok: z.boolean() }),
        fixtureKey: "smoke",
        tier: "fast" as ModelTier,
        timeoutMs: 60_000,
      },
      (prompt) =>
        callOnce(c, {
          prompt,
          tier: "fast",
          purpose: "smoke",
          jsonMode: c.jsonMode ?? false,
          timeoutMs: 60_000,
        })
    );
    return { ok: result.ok === true, ms: Date.now() - started };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
