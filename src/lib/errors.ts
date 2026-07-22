// Stable, language-free error codes for user-facing failures (T-031 Layer 1).
//
// The problem: routes and client-api threw bare Turkish strings that components
// rendered verbatim via `catch (e) { setError(e.message) }`, so an en user saw
// Turkish errors. The highest-frequency one ("Profil yok") fires when NO
// profile exists — there is no profile.uiLanguage to localize from at the throw
// site. So errors travel as CODES and are localized once, at the UI catch
// boundary (see src/lib/i18n/errors.ts + resolveUiLang).
//
// Scope (per the T-031 sweep): the reachable top/mid-tier errors. Bottom-tier
// 400s ("response gerekli" etc.) are code-bug-only and stay as-is; the catalog
// default localizes any unknown code so nothing raw ever renders.

export const ERROR_CODES = [
  "profile_missing",
  "curriculum_not_ready",
  "curriculum_missing",
  "not_found",
  "node_locked",
  "lesson_gen_failed",
  "duplicate_profile",
  "profile_mismatch",
  "no_level_to_extend",
  "save_invalid",
  "save_version_mismatch",
  "save_read_failed",
  "save_load_failed",
  "job_cancelled",
  "curriculum_translate_failed",
  // Kept verbatim: useLlmStatus/client gating already key on this string.
  "llm_unconfigured",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const CODE_SET = new Set<string>(ERROR_CODES);

export function isErrorCode(v: unknown): v is ErrorCode {
  return typeof v === "string" && CODE_SET.has(v);
}

/** An error whose `.message` is a stable code (optionally with params for
 * interpolation, e.g. save version numbers). Localized at the UI boundary. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly params?: Record<string, string | number>;
  constructor(code: ErrorCode, params?: Record<string, string | number>) {
    super(code);
    this.name = "AppError";
    this.code = code;
    this.params = params;
  }
}
