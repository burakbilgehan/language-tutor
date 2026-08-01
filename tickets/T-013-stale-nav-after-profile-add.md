---
id: T-013
title: Header/nav stays on the old profile after adding a new language
status: done
priority: p3
effort: S
confidence: high
depends: []
created: 2026-07-18
---
Observed live (static mode): after adding a new language (zh) via Settings,
the nav tabs (Dictionary, Pinyin) don't show up until a refresh; everything
is normal after refresh.

Known root cause: `src/lib/use-profile-meta.ts` caches profile meta at module
level and relies on the assumption that "active profile changes always happen
via a full page reload" (per the comment in the file). The add-language /
onboarding-return flow navigates without a reload, so the cache goes stale.

Fix direction: either invalidate the cache after profile creation/switch (an
`invalidateProfileMeta()` export that resets the module cache + the relevant
flows call it) OR apply the switch flow's `window.location` pattern to the
new-language flow too. The latter is cheaper and preserves the existing
assumption.

Fix: the two `router.push("/map")` calls in `OnboardingWizard.tsx` (inline
generation finishing in static mode + `GeneratingScreen.onDone`) were changed
to `window.location.href = withBase("/map")`, the same pattern as the switch
flow, a full reload refreshes the cache. `useRouter` was removed since it's
no longer used. Same commit as T-014 (the basePath fix already imported
`withBase`).
