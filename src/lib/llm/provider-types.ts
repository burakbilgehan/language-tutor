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
  /** Caller-side cancellation (T-070-C: the "preparing" screen's cancel
   * button). Combined with the provider's own timeout controller, never
   * replacing it. Providers that ignore it stay correct, just uncancellable. */
  signal?: AbortSignal;
  /** Identity for the browser queue, so a call still WAITING in it can later
   * be promoted to urgent (T-070-D: the user opens a lesson that a prefetch
   * already queued). Ignored by providers without a queue. */
  queueKey?: string;
  /** Short human-readable description ("ders: Sayaçlar"), max ~1-2 lines.
   * Sent to the local bridge as `bridge_label` so its log says WHAT is
   * generating, not just the model name. Ignored by other providers; old
   * bridges silently drop unknown body fields. */
  label?: string;
  /** Son çare kurtarma (runJsonWithRetry): şema doğrulaması başarısız olunca
   * ham JSON'a uygulanır, sonuç şemadan yeniden geçirilir; hâlâ geçmezse
   * normal retry/hata akışı sürer. Ders üretimi bunu "geçersiz alıştırmaları
   * at, >=4 kaldıysa dersi kabul et" için kullanır: superRefine içerik
   * sözleşmeleri JSON Şeması'na çevrilemediğinden model %90 doğru bir dersi
   * tek bozuk alıştırma yüzünden kesin ölüme sürükleyebiliyordu (2026-08-01,
   * 20+ boşa üretim). */
  salvage?: (raw: unknown) => unknown;
}

export interface GenerateTextOptions {
  system?: string;
  prompt: string;
  fixtureKey: string;
  tier: ModelTier;
  timeoutMs?: number;
  /** Interactive call (user is waiting) — jumps ahead of queued background generations. */
  urgent?: boolean;
  /** Caller-side cancellation (T-070-C: the "preparing" screen's cancel
   * button). Combined with the provider's own timeout controller, never
   * replacing it. Providers that ignore it stay correct, just uncancellable. */
  signal?: AbortSignal;
  /** Identity for the browser queue, so a call still WAITING in it can later
   * be promoted to urgent (T-070-D: the user opens a lesson that a prefetch
   * already queued). Ignored by providers without a queue. */
  queueKey?: string;
  /** See GenerateJsonOptions.label. */
  label?: string;
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
/** The caller aborted (T-070-C cancel button). Distinct from a timeout: the
 * UI must not show a failure screen for something the user chose to stop. */
export class LlmCancelledError extends LlmError {
  constructor(message = "Üretim iptal edildi") {
    super(message);
  }
}
export class LlmAuthError extends LlmError {}
export class LlmParseError extends LlmError {}
/** The provider refused because the subscription/API quota or rate limit is
 * exhausted (Max 5-hour window, 429, overloaded). Batch tooling treats this
 * as "pause and retry later", never as a content failure. */
export class LlmQuotaError extends LlmError {}
