"use client";

import { useEffect, useState } from "react";

export interface ProfileMeta {
  targetLanguage: "ja" | "zh" | "nl";
  nativeLanguage: string;
  uiLanguage: string;
}

// Module-level cache: the active profile only changes via a full page reload
// (profile switch sets window.location), so one fetch per page load is enough.
let cached: ProfileMeta | null = null;
let inflight: Promise<ProfileMeta | null> | null = null;

export function useProfileMeta(): ProfileMeta | null {
  const [meta, setMeta] = useState<ProfileMeta | null>(cached);

  useEffect(() => {
    if (cached) return;
    inflight ??= fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) =>
        d?.profile
          ? (cached = {
              targetLanguage: d.profile.targetLanguage,
              nativeLanguage: d.profile.nativeLanguage ?? "tr",
              uiLanguage: d.profile.uiLanguage ?? "tr",
            })
          : null
      )
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
