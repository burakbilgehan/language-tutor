---
id: T-049
title: Login/cloud UX fixes (return-leg dead end + import->push bridge + signed-in intro)
status: done
priority: p1
effort: M
confidence: high
depends: [T-048]
created: 2026-07-27
---
UX breakage found during Burak's first real usage pass on okumo.dev
(2026-07-27). Settings -> "Cloud Account" section exists and is complete
(sign in/out + push/pull), but the flow never surfaces it; the user thinks
"there's no Google linking." Three fixes:

1. **Return-leg dead end**: login succeeds + nothing in the cloud, the screen
   only offers "Try again / Continue." The natural next step for a user who
   already has a save file is missing. Third action: **"Load a save file"**
   (existing file-import flow) -> on successful import, an inline "push to
   cloud" suggestion (push) on the SAME screen.
2. **Import->push bridge**: whenever a signed-in user loads a save through
   any path (onboarding load door, Settings import), an inline "push to
   cloud?" suggestion should appear (a bridge to the Settings section, or an
   inline push button).
3. **Signed-in intro**: a signed-in user still sees the "Sign in" door in the
   intro (T-048's known polish debt). In the signed-in state, that card should
   turn into account status + a "pull from cloud / push to cloud" shortcut.

Fence: onboarding + settings components + auth-status/cloud controller
CONSUMPTION (don't touch cloud.ts/seed-strip logic), don't touch worker/.
i18n tr/en co-located S pattern.

**T-049 implementation decisions (2026-07-27):**

- **The hidden `<input type="file">` was INSIDE the showIntro JSX**, so it
  wasn't mounted on the return leg (a separate early return), meaning
  `fileInputRef.current?.click()` would silently do nothing. The input was
  factored out into a single `fileInput` variable rendered by both branches.
  This was the thing that would have made fix 1 "look like it works but
  doesn't."
- **Import->push confirmation semantics are DELIBERATELY different across the
  two surfaces.** In onboarding, the inline offer itself is the confirmation
  (the user picked the file seconds ago, there's nothing a first-device push
  would overwrite); stacking a `window.confirm` on top would be two
  confirmations in the same click. In Settings, `window.confirm` was KEPT:
  there could be a real save from another device already in the cloud, and
  the user may not have arrived there from a login flow.
- **Verified (not assumed) that push-after-import sees the data:**
  `pushToCloud` -> `isLocalEmpty()` -> `getActiveProfile(handle.db)`;
  `importBytes` reassigns `live`, and `handle.db` is a Proxy over `live`
  (`src/db/browser.ts:225`), so reads always go to the current image. With a
  plain property we'd get `local_empty` on the happy path.
- **Doors are hidden in the intro after import:** since `showIntro` was
  computed at mount, "Start fresh" stayed clickable and would open the wizard
  ON TOP of the newly loaded data.
- **`CloudWarnings` also renders on the intro branch:** with fix 3, pull can
  now also be started from the intro card; warnings state used to render only
  on the return leg, so seed-drift content loss would go unnoticed there.
- **The account card shows "checking" while `auth.loading`.** With
  `useAuthStatus`'s pessimistic default (T-048 decision), a naive
  `auth.user ? account : sign-in` would flash the sign-in card first.
- `cloudErrorText` now also translates push errors (`local_empty`,
  `too_large`); T-048 left them out on the grounds that "onboarding never
  pushes," now it does.

**Requires a browser, needs MANUAL verification:** the checklist in the
report.
