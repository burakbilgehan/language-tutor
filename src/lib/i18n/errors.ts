// Localized messages for the stable error codes (T-031 Layer 1). This is the
// ONE place errors get a language — resolved at the React catch boundary via
// errorMessage(code, uiLanguage, params). Unknown codes fall to a generic
// localized message so a raw Turkish string (e.g. a bottom-tier 400 still
// returning prose) never renders to an en user.

import type { ErrorCode } from "@/lib/errors";
import { isErrorCode, AppError } from "@/lib/errors";
import type { UiLanguage } from "./index";

type Msg = (params?: Record<string, string | number>) => string;

const CATALOG: Record<ErrorCode, { tr: Msg; en: Msg }> = {
  profile_missing: {
    tr: () => "Profil bulunamadı.",
    en: () => "No profile found.",
  },
  curriculum_not_ready: {
    tr: () => "Müfredat henüz hazır değil.",
    en: () => "The curriculum isn't ready yet.",
  },
  curriculum_missing: {
    tr: () => "Müfredat bulunamadı.",
    en: () => "No curriculum found.",
  },
  not_found: {
    tr: () => "Bulunamadı.",
    en: () => "Not found.",
  },
  node_locked: {
    tr: () => "Bu ders henüz kilitli.",
    en: () => "This lesson is still locked.",
  },
  lesson_gen_failed: {
    tr: () => "Ders üretimi tamamlanamadı.",
    en: () => "Lesson generation couldn't complete.",
  },
  duplicate_profile: {
    tr: () => "Bu dil için zaten bir profil var. Ayarlardan geçiş yapabilirsin.",
    en: () => "A profile for this language already exists. Switch to it in Settings.",
  },
  profile_mismatch: {
    tr: () => "Profil uyuşmadı.",
    en: () => "Profile mismatch.",
  },
  no_level_to_extend: {
    tr: () => "Uzatılacak seviye kalmadı.",
    en: () => "No further level to extend to.",
  },
  save_invalid: {
    tr: () => "Geçersiz kayıt dosyası (SQLite değil).",
    en: () => "Invalid save file (not SQLite).",
  },
  save_version_mismatch: {
    tr: (p) =>
      `Kayıt sürümü uyumsuz (dosya: v${p?.file ?? "?"}, uygulama: v${p?.app ?? "?"}).`,
    en: (p) =>
      `Save version mismatch (file: v${p?.file ?? "?"}, app: v${p?.app ?? "?"}).`,
  },
  save_read_failed: {
    tr: () => "Dosya okunamadı.",
    en: () => "Couldn't read the file.",
  },
  save_load_failed: {
    tr: () => "Kayıt yüklenemedi.",
    en: () => "Couldn't load the save.",
  },
  job_cancelled: {
    tr: () => "İptal edildi.",
    en: () => "Cancelled.",
  },
  curriculum_translate_failed: {
    tr: () => "Müfredat çevirisi tamamlanamadı, tekrar dene.",
    en: () => "Curriculum translation couldn't complete, try again.",
  },
  llm_unconfigured: {
    tr: () =>
      "Bu işlem için bir LLM sağlayıcısı gerekli. Ayarlar → LLM Sağlayıcı bölümünden yapılandırabilirsin.",
    en: () =>
      "This needs an LLM provider. Configure one under Settings → LLM Provider.",
  },
};

const GENERIC = {
  tr: "Bir şeyler ters gitti.",
  en: "Something went wrong.",
};

/** Localize an error code. Unknown codes → generic localized message. */
export function errorMessage(
  code: string,
  uiLanguage: UiLanguage,
  params?: Record<string, string | number>
): string {
  if (!isErrorCode(code)) return GENERIC[uiLanguage];
  return CATALOG[code][uiLanguage](params);
}

/** Resolve a thrown value to a localized display string. AppError → catalog;
 * anything else → generic (never render a raw thrown string, which may be
 * wrong-language prose from an unconverted route). */
export function localizeError(err: unknown, uiLanguage: UiLanguage): string {
  if (err instanceof AppError) {
    return errorMessage(err.code, uiLanguage, err.params);
  }
  // A plain Error whose message happens to be a known code (e.g. surfaced by
  // fetchJson from a route's `{ error: code }`) — localize it too.
  if (err instanceof Error && isErrorCode(err.message)) {
    return errorMessage(err.message, uiLanguage);
  }
  return GENERIC[uiLanguage];
}
