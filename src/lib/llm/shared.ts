import { z } from "zod";
import { type ModelTier, type GenerateJsonOptions, LlmParseError } from "./provider";

export const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Records a completed LLM call into llm_calls. Shared by every provider.
 * costUsd defaults to 0 for providers that don't report cost (HTTP/BYO);
 * tokens are optional. Lazy import keeps the providers usable from plain
 * tsx scripts.
 */
export function recordCall(row: {
  purpose: string;
  model: string;
  tier: ModelTier;
  durationMs: number;
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
}) {
  import("@/db")
    .then(({ db, tables }) =>
      db
        .insert(tables.llmCalls)
        .values({
          id: crypto.randomUUID(),
          purpose: row.purpose,
          model: row.model,
          tier: row.tier,
          durationMs: row.durationMs,
          costUsd: row.costUsd ?? 0,
          inputTokens: row.inputTokens,
          outputTokens: row.outputTokens,
        })
        .run()
    )
    .catch((err) => console.warn("[llm] usage kaydedilemedi:", err));
}

/** Strip markdown fences / surrounding prose, keep the first JSON value. */
export function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[{[]/);
  if (start === -1) return body.trim();
  const open = body[start];
  const close = open === "{" ? "}" : "]";
  const end = body.lastIndexOf(close);
  return end > start ? body.slice(start, end + 1) : body.slice(start);
}

export function tryJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Zod schema → draft-7 JSON Schema, without the $schema marker that some
 * validators reject. */
export function schemaToJsonSchema<T>(schema: z.ZodType<T>): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema, { target: "draft-7" }) as Record<
    string,
    unknown
  >;
  delete jsonSchema.$schema;
  return jsonSchema;
}

/**
 * Runs a JSON completion with one parse/schema-retry. `callOnce(prompt)` does a
 * single provider round-trip and returns the raw text; on schema mismatch we
 * append a correction note and retry exactly once. Shared by CLI and HTTP
 * providers so retry semantics stay identical.
 */
export async function runJsonWithRetry<T>(
  opts: GenerateJsonOptions<T>,
  callOnce: (prompt: string, isRetry: boolean) => Promise<string>
): Promise<T> {
  let raw = await callOnce(opts.prompt, false);
  for (let attempt = 0; ; attempt++) {
    const parsed = opts.schema.safeParse(tryJsonParse(extractJson(raw)));
    if (parsed.success) return parsed.data;
    if (attempt >= 1) {
      throw new LlmParseError(
        `LLM çıktısı şemaya uymadı: ${parsed.error.message}`,
        raw
      );
    }
    raw = await callOnce(
      opts.prompt +
        `\n\nÖnceki çıktın şemaya uymadı. Hatalar: ${parsed.error.message}\nSADECE geçerli JSON döndür, başka hiçbir şey yazma.`,
      true
    );
  }
}
