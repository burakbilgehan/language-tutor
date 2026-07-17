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

// OpenAI chat-completions provider. Covers DeepSeek, OpenAI, OpenRouter,
// Ollama, LM Studio and any OpenAI-compatible endpoint — only baseUrl/model
// differ (see presets.ts). Anthropic is NOT OpenAI-compatible and lives in
// anthropic-http-provider.ts.

interface ChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

async function chatCompletion(opts: {
  prompt: string;
  system?: string;
  tier: ModelTier;
  purpose: string;
  jsonMode: boolean;
  timeoutMs: number;
}): Promise<string> {
  const config = readLlmConfig();
  const baseUrl = config?.baseUrl?.replace(/\/$/, "");
  if (!baseUrl) throw new LlmError("LLM baseUrl ayarlı değil");
  const model = modelForTierConfigured(opts.tier);

  const messages: Array<{ role: string; content: string }> = [];
  if (opts.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: opts.prompt });

  const body: Record<string, unknown> = { model, messages };
  if (opts.jsonMode) body.response_format = { type: "json_object" };

  const headers: Record<string, string> = { "content-type": "application/json" };
  if (config?.apiKey) headers.authorization = `Bearer ${config.apiKey}`;

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
      throw new LlmTimeoutError(
        `LLM çağrısı ${opts.timeoutMs / 1000}s içinde bitmedi`
      );
    }
    throw new LlmError(
      `LLM sunucusuna ulaşılamadı: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  clearTimeout(timer);

  const text = await res.text();
  if (res.status === 401 || res.status === 403) {
    throw new LlmAuthError(
      "LLM sağlayıcısı kimliği reddetti — API anahtarını kontrol et.",
      text
    );
  }
  if (!res.ok) {
    throw new LlmError(`LLM sunucusu hata verdi (HTTP ${res.status})`, text);
  }

  let data: ChatResponse;
  try {
    data = JSON.parse(text) as ChatResponse;
  } catch {
    throw new LlmError("LLM yanıtı JSON değil", text);
  }
  if (data.error) {
    throw new LlmError(`LLM hata döndürdü: ${data.error.message ?? "?"}`, text);
  }
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new LlmError("LLM yanıtında içerik yok", text);
  }

  recordCall({
    purpose: opts.purpose,
    model,
    tier: opts.tier,
    durationMs: Date.now() - started,
    costUsd: 0, // BYO providers don't report cost
    inputTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
  });
  return content;
}

export class HttpProvider implements LlmProvider {
  async generateJson<T>(opts: GenerateJsonOptions<T>): Promise<T> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const config = readLlmConfig();
    const jsonMode = config?.jsonMode ?? false;
    // Endpoints without json_object mode still need the shape described, so we
    // append the JSON Schema to the prompt as guidance for every provider.
    const schemaHint = `\n\nÇıktın SADECE şu JSON şemasına uyan geçerli bir JSON olmalı:\n${JSON.stringify(
      schemaToJsonSchema(opts.schema)
    )}`;

    return enqueue(
      () =>
        runJsonWithRetry(opts, (prompt, isRetry) =>
          chatCompletion({
            prompt: prompt + (isRetry ? "" : schemaHint),
            system: opts.system,
            tier: opts.tier,
            purpose: isRetry ? `${opts.fixtureKey}-retry` : opts.fixtureKey,
            jsonMode,
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
        chatCompletion({
          prompt: opts.prompt,
          system: opts.system,
          tier: opts.tier,
          purpose: opts.fixtureKey,
          jsonMode: false,
          timeoutMs,
        }),
      { urgent: opts.urgent }
    );
  }
}
