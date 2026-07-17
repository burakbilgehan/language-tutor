// Tipler + hata sınıfları ortam-bağımsız modülde (provider-types) — tarayıcı
// sağlayıcısı da onları kullanır. Burası sunucu tarafı: getProvider() node
// modüllerini (fs, child_process) lazily require eder.
export type {
  ModelTier,
  GenerateJsonOptions,
  GenerateTextOptions,
  LlmProvider,
} from "./provider-types";
export {
  LlmError,
  LlmTimeoutError,
  LlmAuthError,
  LlmParseError,
} from "./provider-types";

import type { ModelTier, LlmProvider } from "./provider-types";
import { LlmError } from "./provider-types";

export function modelForTier(tier: ModelTier): string {
  const defaults: Record<ModelTier, string> = {
    fast: "haiku",
    balanced: "sonnet",
    deep: "opus",
  };
  const env: Record<ModelTier, string | undefined> = {
    fast: process.env.LLM_MODEL_FAST,
    balanced: process.env.LLM_MODEL_BALANCED,
    deep: process.env.LLM_MODEL_DEEP,
  };
  return env[tier] || defaults[tier];
}

let provider: LlmProvider | undefined;
let providerRevision = -1;

/**
 * Resolves the active provider. Precedence (first match wins):
 *   1. LLM_PROVIDER=fixture  → FixtureProvider (dev, overrides everything)
 *   2. data/llm-config.json  → the configured mode (openai / anthropic / cli / none)
 *   3. no config file        → ClaudeCliProvider (the historical default)
 *
 * Zero-breaking-change: with no config file and no fixture env, this returns
 * exactly what it always did (ClaudeCliProvider). The `none` mode throws on
 * use — callers should gate with llmConfigured() before calling.
 *
 * The singleton rebuilds when the config revision changes (after a PUT to
 * /api/llm-config), so a settings change takes effect without a restart.
 */
export function getProvider(): LlmProvider {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const config = require("./config") as typeof import("./config");
  const rev = config.getConfigRevision();
  if (provider && rev === providerRevision) return provider;

  if (process.env.LLM_PROVIDER === "fixture") {
    const { FixtureProvider } =
      require("./fixture-provider") as typeof import("./fixture-provider"); // eslint-disable-line @typescript-eslint/no-require-imports
    provider = new FixtureProvider();
  } else {
    const mode = config.effectiveMode();
    if (mode === "openai") {
      const { HttpProvider } =
        require("./http-provider") as typeof import("./http-provider"); // eslint-disable-line @typescript-eslint/no-require-imports
      provider = new HttpProvider();
    } else if (mode === "anthropic") {
      const { AnthropicHttpProvider } =
        require("./anthropic-http-provider") as typeof import("./anthropic-http-provider"); // eslint-disable-line @typescript-eslint/no-require-imports
      provider = new AnthropicHttpProvider();
    } else if (mode === "none") {
      provider = new NoneProvider();
    } else {
      const { ClaudeCliProvider } =
        require("./claude-cli") as typeof import("./claude-cli"); // eslint-disable-line @typescript-eslint/no-require-imports
      provider = new ClaudeCliProvider();
    }
  }
  providerRevision = rev;
  return provider;
}

/** Mode "none": no LLM configured. Any call throws a clear error — callers are
 * expected to gate with llmConfigured() and degrade gracefully instead. */
class NoneProvider implements LlmProvider {
  private fail(): never {
    throw new LlmError("LLM ayarlı değil (mode: none)");
  }
  generateJson<T>(): Promise<T> {
    return this.fail();
  }
  generateText(): Promise<string> {
    return this.fail();
  }
}
