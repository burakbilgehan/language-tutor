import type { z } from "zod";

export type ModelTier = "fast" | "balanced" | "deep";

export interface GenerateJsonOptions<T> {
  system?: string;
  prompt: string;
  schema: z.ZodType<T>;
  /** Name used by the FixtureProvider to pick a canned response. */
  fixtureKey: string;
  tier: ModelTier;
  timeoutMs?: number;
}

export interface GenerateTextOptions {
  system?: string;
  prompt: string;
  fixtureKey: string;
  tier: ModelTier;
  timeoutMs?: number;
}

export interface LlmProvider {
  generateJson<T>(opts: GenerateJsonOptions<T>): Promise<T>;
  generateText(opts: GenerateTextOptions): Promise<string>;
}

export class LlmError extends Error {
  constructor(message: string, readonly rawOutput?: string) {
    super(message);
  }
}
export class LlmTimeoutError extends LlmError {}
export class LlmAuthError extends LlmError {}
export class LlmParseError extends LlmError {}

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

export function getProvider(): LlmProvider {
  if (provider) return provider;
  if (process.env.LLM_PROVIDER === "fixture") {
    const { FixtureProvider } =
      require("./fixture-provider") as typeof import("./fixture-provider"); // eslint-disable-line @typescript-eslint/no-require-imports
    provider = new FixtureProvider();
  } else {
    const { ClaudeCliProvider } =
      require("./claude-cli") as typeof import("./claude-cli"); // eslint-disable-line @typescript-eslint/no-require-imports
    provider = new ClaudeCliProvider();
  }
  return provider;
}
