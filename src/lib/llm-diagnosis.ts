"use client";

// T-063: "your bridge is down" diagnosis for generation failures.
//
// Today a generation failure against a local provider (bridge/Ollama) that
// has died mid-session renders a GENERIC message either way — server mode
// because /api/chat has no try/catch (Next.js turns the unhandled throw into
// a bare 500, whose body carries no recognized error code, so fetchJson's
// `new Error("HTTP 500")` collapses to GENERIC at localizeError); static
// mode because the thrown LlmError's message (which DOES already embed a
// "köprü/Ollama çalışıyor mu?" hint, see browser-provider.ts) is a raw
// string, not a registered ErrorCode, so it ALSO collapses to GENERIC. There
// is no leaked cryptic string today — the gap is a useless generic where an
// actionable one is possible. This module is purely additive: it runs AFTER
// the existing localize(e) would already produce GENERIC, never before.
//
// Split for testability: `classifyGenerationFailure` is pure (a decision
// table, no fetch) and unit-tested directly; `diagnoseGenerationFailure` is
// the thin async wrapper that decides whether a probe is worth firing at all
// and, if so, reuses useLocalLlmProbe.ts's probeBridge/probeOllama (same
// fetch+timeout+parse, not re-implemented here) for a single one-shot check.
//
// Deliberately does NOT sniff err.message for provider-specific substrings
// ("ulaşılamadı", "Failed to fetch", ...) — those strings live in
// src/lib/llm/*, a sibling ticket's fence, and would silently drift. The
// probe result is the only signal used to decide "bridge down" vs "bridge up,
// something else broke."

import { AppError, isErrorCode } from "@/lib/errors";
// provider-types.ts, NOT provider.ts: provider.ts is server-only (lazily
// requires node:fs/child_process for the CLI provider) and this module is
// imported from client components (ChatPanel/LessonPlayer) — importing the
// server file here pulled node builtins into the static-mode client bundle
// and broke `npm run build:static` (caught while verifying this ticket).
import { LlmAuthError } from "@/lib/llm/provider-types";
import { CATALOG } from "@/lib/llm/catalog";
import {
  probeBridge,
  probeOllama,
  type ProbeState,
} from "@/components/settings/useLocalLlmProbe";
import type { UiLanguage } from "@/lib/i18n/index";
import { localizeError } from "@/lib/i18n/errors";

export type LocalTarget = "bridge" | "ollama";

/** Which local endpoint a configured baseUrl points at, or null when it's
 * not one of the two known local providers (a custom localhost endpoint the
 * user typed in the advanced panel gets no diagnosis — we don't know its
 * health-check shape). Host+port match, ignoring the /v1 suffix and a
 * trailing slash (same normalization catalog.ts's providerForBaseUrl uses). */
export function localTargetFor(baseUrl: string | undefined): LocalTarget | null {
  if (!baseUrl) return null;
  const norm = baseUrl.replace(/\/$/, "");
  if (norm === CATALOG.bridge.baseUrl.replace(/\/$/, "")) return "bridge";
  if (norm === CATALOG.ollama.baseUrl.replace(/\/$/, "")) return "ollama";
  return null;
}

export type GenerationDiagnosis =
  /** Not a local-provider case (no local baseUrl, or the error already has a
   * known code/shape) — caller should render the normal localize(e) text. */
  | { kind: "pass_through"; message: string }
  /** Probed the configured local endpoint and got no answer: the process is
   * either not running or the browser can't reach it (T-039 origin gate —
   * these two causes are indistinguishable from a fetch error, so the copy
   * must name both, matching useLocalLlmProbe.ts's documented "absent"
   * meaning). */
  | { kind: "local_down"; target: LocalTarget; message: string }
  /** Probed and the endpoint DID answer (bridge running an old build without
   * /health) — still worth a distinct, more specific hint than generic. */
  | { kind: "local_stale"; target: LocalTarget; message: string }
  /** Probed and the endpoint is healthy — the failure is something else
   * (bad model id, auth, malformed response); don't invent a diagnosis,
   * fall back to the generic message. */
  | { kind: "local_up_other_cause"; message: string };

const S = {
  tr: {
    downBridge: (originHint: string) =>
      `Köprün kapalı görünüyor. Terminalde yeniden başlat: \`node llm-bridge.mjs\`${originHint}; dosya yoksa Ayarlar'daki kurulum komutunu kullan.`,
    downOllama: (originHint: string) =>
      `Ollama'ya ulaşılamıyor. Ollama'nın açık olduğundan emin ol.${originHint}`,
    staleBridge:
      "Köprü çalışıyor ama eski bir sürüm (durum uç noktasını bilmiyor). Yine de üretim başka bir nedenle başarısız oldu.",
    originHint: (flag: string) =>
      ` (ya da bu site şu an izinli değil — komuttaki ${flag} kısmını kontrol et)`,
  },
  en: {
    downBridge: (originHint: string) =>
      `Your bridge looks offline. Restart it in a terminal: \`node llm-bridge.mjs\`${originHint}; if you don't have the file, use the setup command in Settings.`,
    downOllama: (originHint: string) =>
      `Can't reach Ollama. Make sure Ollama is running.${originHint}`,
    staleBridge:
      "The bridge is running but on an older version (it doesn't know the status endpoint). Generation failed for another reason.",
    originHint: (flag: string) =>
      ` (or this site isn't currently permitted — check the ${flag} part of the command)`,
  },
} as const;

export interface ClassifyInput {
  err: unknown;
  /** Which local endpoint the active config points at — null when it's not
   * bridge/ollama (remote API, or an unrecognized custom localhost URL we
   * don't know how to health-check). */
  probeTarget: LocalTarget | null;
  /** Result of a single probe against probeTarget, or "skipped" if no probe
   * was attempted (probeTarget is null, or the error was already a known
   * code). */
  probeState: ProbeState | "skipped";
  uiLang: UiLanguage;
  isLocalOrigin: boolean;
  origin: string;
}

/** Pure decision table — no fetch, fully unit-testable. */
export function classifyGenerationFailure(
  input: ClassifyInput
): GenerationDiagnosis {
  const { err, probeTarget, probeState, uiLang, isLocalOrigin, origin } = input;
  const t = S[uiLang];
  const generic = localizeError(err, uiLang);

  // Known, already-meaningful errors (llm_unconfigured, node_locked, ...) and
  // auth rejections (bridge/server IS up, just refusing) are never
  // reinterpreted as "bridge down" — that would be actively misleading.
  const hasKnownCode =
    err instanceof AppError ||
    (err instanceof Error && isErrorCode(err.message));
  if (hasKnownCode || err instanceof LlmAuthError) {
    return { kind: "pass_through", message: generic };
  }
  if (probeTarget === null || probeState === "skipped") {
    return { kind: "pass_through", message: generic };
  }

  const originHint = isLocalOrigin
    ? ""
    : t.originHint(
        probeTarget === "bridge" ? `--origin ${origin}` : "OLLAMA_ORIGINS"
      );

  if (probeState === "absent") {
    const message =
      probeTarget === "bridge" ? t.downBridge(originHint) : t.downOllama(originHint);
    return { kind: "local_down", target: probeTarget, message };
  }
  if (probeState === "stale") {
    return { kind: "local_stale", target: probeTarget, message: t.staleBridge };
  }
  // "found"/"searching" (searching shouldn't reach here — caller awaits the
  // probe to completion first, but treat it as "up" defensively): endpoint is
  // reachable, so the failure has some other cause. Never render the raw
  // LlmError text — keep the existing generic message.
  return { kind: "local_up_other_cause", message: generic };
}

export interface DiagnoseInput {
  err: unknown;
  /** Active provider's configured baseUrl, as read from llmConfigGet(). */
  baseUrl: string | undefined;
  uiLang: UiLanguage;
  isLocalOrigin: boolean;
  origin: string;
  /** Probe timeout — kept short for the same reason useLocalLlmProbe.ts uses
   * 1500ms: a local server either answers immediately or is not there. */
  timeoutMs?: number;
}

/** Async wrapper: fires at most one probe (only when the failure is
 * otherwise generic AND the configured endpoint is a recognized local
 * provider), then classifies. Never throws — a probe failure itself just
 * yields "absent". */
export async function diagnoseGenerationFailure(
  input: DiagnoseInput
): Promise<GenerationDiagnosis> {
  const { err, baseUrl, uiLang, isLocalOrigin, origin, timeoutMs } = input;
  const probeTarget = localTargetFor(baseUrl);

  const hasKnownCode =
    err instanceof AppError ||
    (err instanceof Error && isErrorCode(err.message));
  // baseUrl is narrowed to a defined, non-empty string whenever probeTarget
  // is non-null (localTargetFor returns null for undefined/empty input) —
  // TS can't see across that function boundary, so narrow explicitly instead
  // of asserting with `!` at the call site below.
  if (hasKnownCode || err instanceof LlmAuthError || probeTarget === null || !baseUrl) {
    return classifyGenerationFailure({
      err,
      probeTarget,
      probeState: "skipped",
      uiLang,
      isLocalOrigin,
      origin,
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs ?? 1500);
  let probeState: ProbeState;
  try {
    const result =
      probeTarget === "bridge"
        ? await probeBridge(baseUrl, controller.signal)
        : await probeOllama(baseUrl, controller.signal);
    probeState = result.state;
  } finally {
    clearTimeout(timer);
  }

  return classifyGenerationFailure({
    err,
    probeTarget,
    probeState,
    uiLang,
    isLocalOrigin,
    origin,
  });
}
