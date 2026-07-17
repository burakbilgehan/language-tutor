"use client";

import { useProfileMeta } from "@/lib/use-profile-meta";
import { pick, type LocalizedStrings } from "./index";

/**
 * Resolve a component's co-located string table by the active profile's
 * uiLanguage. While the profile meta is still loading this returns tr —
 * the default for every pre-existing profile, so no flash for them.
 */
export function useStrings<T>(strings: LocalizedStrings<T>): T {
  const meta = useProfileMeta();
  return pick(strings, meta?.uiLanguage);
}
