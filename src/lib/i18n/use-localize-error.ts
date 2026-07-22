"use client";

import { useProfileMeta } from "@/lib/use-profile-meta";
import { localizeError } from "./errors";
import type { UiLanguage } from "./index";

/** Best-effort UI language when no profile is loaded yet (onboarding, races):
 * active profile's uiLanguage → navigator.language → tr. Onboarding passes its
 * draft language explicitly instead of relying on this. */
export function resolveUiLang(profileUi?: string | null): UiLanguage {
  if (profileUi === "en" || profileUi === "tr") return profileUi;
  if (typeof navigator !== "undefined") {
    return navigator.language?.toLowerCase().startsWith("en") ? "en" : "tr";
  }
  return "tr";
}

/** Returns a function that turns any thrown value into a localized display
 * string, using the active profile's uiLanguage (falling back gracefully). Use
 * in catch blocks: `catch (e) { setError(localize(e)) }`. */
export function useLocalizeError(): (err: unknown) => string {
  const meta = useProfileMeta();
  const uiLang = resolveUiLang(meta?.uiLanguage);
  return (err: unknown) => localizeError(err, uiLang);
}
