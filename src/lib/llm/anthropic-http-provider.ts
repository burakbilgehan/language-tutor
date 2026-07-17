import {
  type LlmProvider,
  type GenerateJsonOptions,
  type GenerateTextOptions,
  type ModelTier,
  LlmError,
  LlmAuthError,
  LlmTimeoutError,
} from "./provider";
import { enqueue } from "./queue";
import {
  DEFAULT_TIMEOUT_MS,
  recordCall,
  runJsonWithRetry,
  schemaToJsonSchema,
} from "./shared";
import { readLlmConfig, modelForTierConfigured } from "./config";

// Anthropic-native provider (/v1/messages). Anthropic is NOT OpenAI-compatible
// — different wire format (x-api-key, content blocks, system as top-level).
// Used when the friend has an Anthropic API key. In the future browser/static
// phase this same shape works from the browser with the
// `anthropic-dangerous-direct-browser-access` header; server-side it's not
// needed.

const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_BASE = "https://api.anthropic.com/v1";
const MAX_TOKENS = 8192;

interface MessagesResponse {
  content?: Array<{ type?: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
}

async function messages(opts: {
  prompt: string;
  system?: string;
  tier: ModelTier;
  purpose: string;
  timeoutMs: number;
}): Promise<string> {
  const config = readLlmConfig();
  const baseUrl = (config?.baseUrl?.replace(/\/$/, "") || DEFAULT_BASE);
  const model = modelForTierConfigured(opts.tier);
  if (!config?.apiKey) throw new LlmError("Anthropic API anahtarı ayarlı değil");

  const body: Record<string, unknown> = {
    model,
    max_tokens: MAX_TOKENS,
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
        "x-api-key": config.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new LlmTimeoutError(
        `LLM çağrısı ${opts.timeoutMs / 1000}s içinde bitmedi`
      );
    }
    throw new LlmError(
      `Anthropic'e ulaşılamadı: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  clearTimeout(timer);

  const text = await res.text();
  if (res.status === 401 || res.status === 403) {
    throw new LlmAuthError(
      "Anthropic kimliği reddetti — API anahtarını kontrol et.",
      text
    );
  }
  if (!res.ok) {
    throw new LlmError(`Anthropic hata verdi (HTTP ${res.status})`, text);
  }

  let data: MessagesResponse;
  try {
    data = JSON.parse(text) as MessagesResponse;
  } catch {
    throw new LlmError("Anthropic yanıtı JSON değil", text);
  }
  if (data.error) {
    throw new LlmError(`Anthropic hata döndürdü: ${data.error.message ?? "?"}`, text);
  }
  const out = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  if (!out) throw new LlmError("Anthropic yanıtında metin yok", text);

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `[llm] provider=anthropic-api host=${new URL(baseUrl).host} model=${model} tier=${opts.tier} purpose=${opts.purpose} ${secs}s`
  );
  recordCall({
    purpose: opts.purpose,
    model,
    tier: opts.tier,
    durationMs: Date.now() - started,
    costUsd: 0,
    inputTokens: data.usage?.input_tokens,
    outputTokens: data.usage?.output_tokens,
  });
  return out;
}

export class AnthropicHttpProvider implements LlmProvider {
  async generateJson<T>(opts: GenerateJsonOptions<T>): Promise<T> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const schemaHint = `\n\nÇıktın SADECE şu JSON şemasına uyan geçerli bir JSON olmalı:\n${JSON.stringify(
      schemaToJsonSchema(opts.schema)
    )}`;

    return enqueue(
      () =>
        runJsonWithRetry(opts, (prompt, isRetry) =>
          messages({
            prompt: prompt + (isRetry ? "" : schemaHint),
            system: opts.system,
            tier: opts.tier,
            purpose: isRetry ? `${opts.fixtureKey}-retry` : opts.fixtureKey,
            timeoutMs,
          })
        ),
      { urgent: opts.urgent }
    );
  }

  async generateText(opts: GenerateTextOptions): Promise<string> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    return enqueue(
      () =>
        messages({
          prompt: opts.prompt,
          system: opts.system,
          tier: opts.tier,
          purpose: opts.fixtureKey,
          timeoutMs,
        }),
      { urgent: opts.urgent }
    );
  }
}
