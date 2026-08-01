---
id: T-014
title: Static-mode navigations lose basePath (drops to /map after import + language switch)
status: done
priority: p1
effort: S
confidence: high
depends: []
created: 2026-07-18
---

> **Deploy target note (amended 2026-07-27):** this ticket predates the okumo.dev migration; GitHub Pages references below no longer apply. The Pages mirror was removed 2026-07-27; okumo.dev (Cloudflare Worker) is the only deploy. See [T-045](T-045-backend-spike-skeleton.md) / [T-054](T-054-okumo-landing.md).

Observed live: after a save import, and after switching language (profile),
the browser goes to `https://burakbilgehan.github.io/map`, the basePath
(`/language-tutor`) is dropped, the user gets kicked off the site.

Root cause confirmed: hard navigations don't use `withBase()`:
- `src/app/settings/page.tsx:131` -> `window.location.href = "/map"` (after import)
- `src/components/settings/ProfileSection.tsx:177` -> `window.location.href = "/map"` (profile switch)

Next's `router.push` adds the basePath automatically but `window.location`
does not; these flows deliberately use `window.location` because they need a
full reload (the use-profile-meta cache assumption, see T-013).

Fix: route these two spots (and any similar ones found via grep) through
`withBase("/map")` (`src/lib/base-path.ts`). `client-api.ts:502`'s
`/api/save/export` is in the same class, leave it alone if static mode
already follows a different path there, fix it too otherwise. Verification:
`npm run build:static` + try the import and language-switch flows end to end
on Pages (or simulate the base path with `npx serve out`).

Note: same area as T-013 (stale nav); can be implemented together but can
also be done independently.

Fix: the two spots were changed to `withBase("/map")`. `client-api.ts:502`
(`/api/save/export`) left untouched, it's in the `!IS_STATIC` branch, no
basePath in server mode. The static-mode branch below `client-api.ts:502`
already follows a different path (blob download) anyway. `npm run build:static`
is clean; real Pages sub-path behavior couldn't be simulated with `npx serve
out` (serve serves from root), verified at the code level via grep +
typecheck + build; a manual check in the real Pages environment after deploy
is recommended.
