---
id: T-054
title: okumo.dev landing page (design handoff, separate scope)
status: done
priority: p3
effort: M
confidence: low
depends: [T-052]
created: 2026-07-27
---

## Decision + implementation (2026-07-31)

**Landing lives AT `/`, the root.** Rationale: a marketing surface needs to be
crawlable/unfurlable; the old `/` was a client-side redirect gate (a 🌸
spinner) that showed crawlers nothing. A separate path (`/welcome`) would
still drop a bare `okumo.dev` visitor into the spinner.

Returning users are resolved in two layers:
- `src/lib/visited-flag-key.ts` + `visited-flag.ts`: every UI path that
  creates a profile writes a synchronous localStorage flag (6 spots).
- `ReturningUserGate`: an inline script BEFORE paint (the theme script's
  counterpart); if the flag is set, `location.replace("/map")` runs before
  landing ever renders.
- IndexedDB REMAINS the single source of truth; the flag is only a shortcut.

**Known trade-off:** a user with data but no flag (pre-flag profiles,
localStorage cleared) sees landing once. The way out is the "continue your
saved progress" link under the hero, which runs the full `profileData()`
path only ON CLICK and backfills the flag. Not on mount: to avoid making a
marketing visitor pay for the sql.js boot.

**AppChrome:** `SelectionTooltip`/`CommandPalette`/`FeedbackButton` all
triggered `useProfileMeta()` -> `profileData()` -> a ~645KB sql.js WASM +
IndexedDB boot, and were mounted UNCONDITIONALLY in RootLayout, meaning the
cost was route-independent; moving landing to a separate path wouldn't even
have fixed it. They're now not mounted on landing, via `usePathname()`.

Left out of scope (separate work): favicon/OG image/robots.txt/sitemap asset
production, screenshot pipeline (the preview was built from DS patterns in
CSS), pricing/monetization messaging.
Separate scope in the handoff: a landing page for okumo.dev.
Reference: the v1 mock was `design/okumo-sky/Okumo Landing.dc.html`; the v1
handoff is INVALID and was deleted (in git history: `5ad0c88`). When this
work is picked up it's based on the v2 Yūyake system
(`design/okumo-yuyake/`); there's no landing mock in v2, it's built from
scratch using DS v2 tokens/component roles.

okumo.dev is currently the app itself (Worker static assets, anonymous start
+ login). Landing = the marketing surface introducing the product, passing
users into the app via "start."
Open decisions (Burak):
- Is landing the app's ROOT (`/` landing -> `/onboarding` app), or a separate
  path?
- How does it fit the static export (existing root pages pattern,
  `<Suspense>` rule)?
- Is scope marketing-only (features, screenshots, "start" CTA), or also
  pricing/monetization messaging (monetization model isn't decided yet, so
  keep marketing-only for now).

The sky family + Kumo mark (T-052) are also used on landing, hence depends
T-052. confidence low: landing content/structure depends on Burak's product
messaging, the mock is only a starting point. Design- and copy-heavy. Lower
priority relative to other content/security work; picked up before okumo is
publicly announced.
