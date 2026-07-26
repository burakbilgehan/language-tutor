// T-048: classify a cloud sync (T-047) failure into a UI kind.
//
// Why this exists as a pure module instead of a `catch` chain inside the two
// components: it is the only real logic in the login/entry UI, it must be
// identical in onboarding and in Settings, and it is the one part of a
// browser-driven feature that can actually be proven by `npm test`.
//
// It deliberately does NOT return copy. The kinds map to entries in each
// component's co-located `S` table, because two of them need CLOUD-SPECIFIC
// wording that the shared error catalog cannot give:
//
//   - `save_invalid` is what pushToCloud() throws on HTTP 413, but the shared
//     catalog renders that code as "Geçersiz kayıt dosyası (SQLite değil)" —
//     which is a lie about a save that is perfectly valid and merely larger
//     than the Worker's 30 MB cap. Editing the shared catalog would change the
//     message for the server-mode file-import path too, so the honest wording
//     lives in the cloud components instead.
//   - `save_load_failed` covers both "nothing stored in the cloud yet" (404)
//     and "the service blipped" (503). Neither is a broken local save.

import { AppError } from "@/lib/errors";
import { LocalEmptyError, NotSignedInError } from "@/lib/backup/cloud";

export type CloudErrorKind =
  /** No session — render a sign-in prompt, not a failure. */
  | "not_signed_in"
  /** Push refused: the local DB looks empty. Offer a pull instead. */
  | "local_empty"
  /** HTTP 413 — the save exceeds the Worker's upload cap. */
  | "too_large"
  /** Save-format version mismatch; params carry file/app versions. */
  | "version_mismatch"
  /** Nothing stored yet, or the service is unavailable. Local save is fine. */
  | "unavailable"
  /** Anything else (network, unexpected throw). */
  | "unknown";

export interface CloudErrorInfo {
  kind: CloudErrorKind;
  /** Present only for `version_mismatch`, straight from the AppError. */
  params?: Record<string, string | number>;
}

export function describeCloudError(err: unknown): CloudErrorInfo {
  if (err instanceof NotSignedInError) return { kind: "not_signed_in" };
  if (err instanceof LocalEmptyError) return { kind: "local_empty" };
  if (err instanceof AppError) {
    switch (err.code) {
      case "save_invalid":
        return { kind: "too_large" };
      case "save_version_mismatch":
        return { kind: "version_mismatch", params: err.params };
      case "save_load_failed":
        return { kind: "unavailable" };
      default:
        return { kind: "unknown" };
    }
  }
  return { kind: "unknown" };
}
