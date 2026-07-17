import type { ModelTier } from "./provider-types";

export {
  DEFAULT_TIMEOUT_MS,
  extractJson,
  tryJsonParse,
  schemaToJsonSchema,
  runJsonWithRetry,
} from "./shared-pure";

/**
 * Records a completed LLM call into llm_calls. Shared by every SERVER
 * provider (browser provider writes via the browser db directly).
 * costUsd defaults to 0 for providers that don't report cost; tokens are
 * optional. Lazy import keeps the providers usable from plain tsx scripts.
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
