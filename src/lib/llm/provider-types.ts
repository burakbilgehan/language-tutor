import type { z } from "zod";

// Ortam-bağımsız LLM tipleri + hata sınıfları. provider.ts (sunucu, getProvider
// içinde node modülleri require eder) ve tarayıcı sağlayıcısı bunları paylaşır
// — istemci bundle'ına node bağımlılığı sızmaz.

export type ModelTier = "fast" | "balanced" | "deep";

export interface GenerateJsonOptions<T> {
  system?: string;
  prompt: string;
  schema: z.ZodType<T>;
  /** Name used by the FixtureProvider to pick a canned response. */
  fixtureKey: string;
  tier: ModelTier;
  timeoutMs?: number;
  /** Interactive call (user is waiting) — jumps ahead of queued background generations. */
  urgent?: boolean;
}

export interface GenerateTextOptions {
  system?: string;
  prompt: string;
  fixtureKey: string;
  tier: ModelTier;
  timeoutMs?: number;
  /** Interactive call (user is waiting) — jumps ahead of queued background generations. */
  urgent?: boolean;
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
