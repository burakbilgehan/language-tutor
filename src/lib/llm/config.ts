import path from "node:path";
import fs from "node:fs";
import type { ModelTier } from "./provider";

// Runtime LLM provider config, stored as a plain JSON file — NOT in the DB.
// Deliberate: the save export serializes the SQLite image, and a replace-all
// import wipes local data; keeping the (possibly secret) API key out of the DB
// means it never leaks into a shared save and an import never clobbers the
// friend's own provider settings.

export type LlmMode = "cli" | "openai" | "anthropic" | "none";

export interface LlmConfig {
  mode: LlmMode;
  /** OpenAI-compatible or Anthropic base URL. */
  baseUrl?: string;
  /** API key for the chosen provider (empty for local servers). */
  apiKey?: string;
  /** tier → model id. */
  models?: { fast?: string; balanced?: string; deep?: string };
  /** OpenAI-compat: send response_format json_object. */
  jsonMode?: boolean;
  /** Serialized-call concurrency (default 2 for HTTP, 1 for cli). */
  concurrency?: number;
}

function configPath(): string {
  return path.join(process.cwd(), "data", "llm-config.json");
}

/** Deployment guard: when set, the local `claude` CLI provider is never used
 * — so a hosted instance can't bill the owner's Max subscription. */
export function cliAllowed(): boolean {
  return process.env.LLM_CLI_DISABLED !== "1";
}

let cache: LlmConfig | null | undefined;

/** Reads the config file (cached). Returns null when no file exists — the
 * caller then falls back to the historical CLI default. */
export function readLlmConfig(): LlmConfig | null {
  if (cache !== undefined) return cache;
  try {
    const raw = fs.readFileSync(configPath(), "utf8");
    cache = JSON.parse(raw) as LlmConfig;
  } catch {
    cache = null;
  }
  return cache;
}

export function writeLlmConfig(config: LlmConfig): void {
  const dir = path.dirname(configPath());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(config, null, 2), "utf8");
  cache = config;
}

/** Clears the cache so getProvider() and readLlmConfig() re-read after a
 * config change. Bump a revision so the provider singleton rebuilds. */
export function resetLlmConfig(): void {
  cache = undefined;
  configRevision++;
}

let configRevision = 0;
export function getConfigRevision(): number {
  return configRevision;
}

/** Resolves the *effective* mode after the deployment guard. A config that
 * asks for cli on a CLI-disabled deployment collapses to "none". No config
 * file at all means the historical CLI default (guard still applies). */
export function effectiveMode(): LlmMode {
  const config = readLlmConfig();
  const mode: LlmMode = config?.mode ?? "cli";
  if (mode === "cli" && !cliAllowed()) return "none";
  return mode;
}

/** True when the app has a working LLM path configured. Drives job-enqueue
 * guards and UI gating; does NOT make a network call. */
export function llmConfigured(): boolean {
  const mode = effectiveMode();
  if (mode === "none") return false;
  if (mode === "cli") return true; // login checked lazily on first call
  const config = readLlmConfig();
  // http modes need a base URL; a model can fall back to env/defaults.
  return Boolean(config?.baseUrl);
}

/** tier → model id, resolved from config first, then env, then defaults.
 * Used by the HTTP providers (the CLI provider keeps modelForTier for its
 * short aliases). */
export function modelForTierConfigured(tier: ModelTier): string {
  const config = readLlmConfig();
  const fromConfig = config?.models?.[tier];
  if (fromConfig) return fromConfig;
  const env: Record<ModelTier, string | undefined> = {
    fast: process.env.LLM_MODEL_FAST,
    balanced: process.env.LLM_MODEL_BALANCED,
    deep: process.env.LLM_MODEL_DEEP,
  };
  return env[tier] || tier;
}
