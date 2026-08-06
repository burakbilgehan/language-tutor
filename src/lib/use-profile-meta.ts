"use client";

import { useEffect, useState } from "react";
import { profileData } from "@/lib/client-api";

export interface ProfileMeta {
  targetLanguage: "ja" | "zh" | "nl" | "fr";
  nativeLanguage: string;
  uiLanguage: string;
}

// Module-level cache: the active profile only changes via a full page reload
// (profile switch sets window.location), so one fetch per page load is enough.
let cached: ProfileMeta | null = null;
let inflight: Promise<ProfileMeta | null> | null = null;

/**
 * Drops the module cache so the next mount refetches. Exists for the one flow
 * that changes the active profile WITHOUT a full reload: static onboarding
 * creates the profile and SPA-navigates straight to the map (a reload there
 * would kill the in-context curriculum generation that follows).
 */
export function resetProfileMeta() {
  cached = null;
  inflight = null;
}

export function useProfileMeta(): ProfileMeta | null {
  const [meta, setMeta] = useState<ProfileMeta | null>(cached);

  useEffect(() => {
    if (cached) return;
    inflight ??= profileData()
      .then((d) => {
        if (!d?.profile) return null;
        cached = {
          targetLanguage: d.profile.targetLanguage as ProfileMeta["targetLanguage"],
          nativeLanguage: d.profile.nativeLanguage ?? "tr",
          uiLanguage: d.profile.uiLanguage ?? "tr",
        };
        // Köprü log dili UI dilini izlesin diye senkron okunabilir bir ayna:
        // browser-provider istek gövdesine `bridge_lang` koyarken DB'ye inip
        // profil çekemez (her LLM çağrısında gereksiz async yük), buradan okur.
        try {
          localStorage.setItem("okumo-ui-lang", cached.uiLanguage);
        } catch {
          /* private mode vb. */
        }
        return cached;
      })
      .catch(() => null);
    let stopped = false;
    inflight.then((m) => {
      if (m && !stopped) setMeta(m);
    });
    return () => {
      stopped = true;
    };
  }, []);

  return meta;
}
