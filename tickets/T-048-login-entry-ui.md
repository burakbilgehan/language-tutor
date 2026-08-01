---
id: T-048
title: Login entry UI - anonymous/load + login option + pull from cloud
status: done
priority: p2
effort: M
confidence: high
depends: [T-047]
created: 2026-07-26
---
Once the backend works end-to-end, wire up the user-facing surface. On entry
people should STILL be greeted by the anonymous-join + load-save screen
(existing T-025 onboarding load/new), but **now with a login option too**.

- **Third door in onboarding:** "Start anonymously" / "Load a save (file)" /
  **"Sign in"** (Google + magic-link). The anonymous flow doesn't change at
  all (local-first).
- **After login:** **pull** the user's own save from the cloud (T-047 pull),
  or push to the cloud if it's a first-time new device. Account status
  indicator (who's signed in, last sync time).
- **Settings:** sign out, "push to cloud / pull from cloud" (next to or in
  place of the Drive buttons), link/unlink account.
- **i18n:** new copy in tr/en (existing co-located `S` pattern).

Fence: onboarding components + settings + auth-status hook. Once the Worker
code (T-046/T-047) is done, this is purely frontend, so the file sets are
largely disjoint.

**T-048 implementation decisions (2026-07-26):**

- **No magic-link** (T-046 owner decision), the third door is Google-only.
- **The better-auth client package was NOT added, manual fetch instead.**
  Rationale: the surface used is two endpoints
  (`POST /api/auth/sign-in/social` -> `200 {url}`,
  `GET /api/auth/get-session`) plus `POST /api/auth/sign-out`, and these
  shapes are already locked by `worker/test/session.test.ts`. Adding an auth
  library to the root `package.json` would be unnecessary weight for a static
  bundle that mostly runs anonymously. Root dependencies UNCHANGED.
- **`cloudAvailable()` CANNOT be used as a render gate** (a trap found along
  the way): `IS_STATIC && isSignedIn()`, meaning it's false before signing in,
  so gating the "sign in" button on it would be a deadlock (you'd need to be
  signed in to see the button). The correct discriminator is "does this
  origin have a backend," which is already an open endpoint: `GET /api/health`
  on the Worker returns 200, 404 on the anonymous-only GitHub Pages mirror.
  The probe lives in `useAuthStatus`, via `readCloudApiBase()`, no origin is
  hardcoded. `cloudAvailable()` still applies for push/pull (where a session
  is genuinely required); unchanged in T-047.
- **`useAuthStatus` has a PESSIMISTIC default** (the opposite of useLlmStatus,
  deliberately): `{user:null, loading:true}`. Saying "signed in" before the
  server confirms would be a lie, and every button behind it would break on
  first click.
- **The OAuth return leg does NOT use `useSearchParams`.** The `/onboarding`
  page has no `<Suspense>` wrapper; adding the hook would break the static
  export (no permission to run the build, so this is an unverified risk).
  The marker is read from `window.location.search` inside `useEffect`.
- **`callbackURL` is an absolute URL:**
  `window.location.origin + withBase("/onboarding") + "?cloud=return"`.
  A relative `"/"` would fall to the Worker's own root when the API-base
  override is set. **Not verified, note for the owner:** better-auth checks
  `callbackURL` against `trustedOrigins(env)`; fine in production since it's
  same-origin, but in dev (:3000) and possible mirror scenarios the site
  origin needs to be in that allowlist (Worker config, outside this ticket's
  fence).
- **Return-leg flow:** after the session resolves, it does NOT blindly call
  `cloudPull()`, it calls `cloudInfo()` (HEAD, no egress). 404 means "you
  haven't pushed to the cloud yet," continue to normal onboarding; exists
  means offer a pull. Blindly pulling would make the "first device" scenario
  look like an error.
- **Pull confirmation:** since it's replace-all, it gets the same weight
  `window.confirm` as the file-import flow. Skipped only in a session that's
  CONFIRMED to have no profiles (`!checkingProfiles && usedLanguages.length === 0`);
  asked when not yet known, the safe side.
- **`PullResult.warnings` is NOT a toast.** In onboarding, redirecting to
  `/map` after pull would throw the list away; if there are warnings, the
  redirect is HELD, `CloudWarnings` shows the count of items, and it proceeds
  once the user acknowledges. In settings it stays until dismissed in section
  state.
- **Contract rough edge (not fixed, deliberate):** `pushToCloud` throws
  `AppError("save_invalid")` on 413, but the shared catalog displays that code
  as "Invalid save file (not SQLite)", which is wrong info for a file that's
  simply too large but perfectly valid. `src/lib/i18n/errors.ts` was not
  changed (the same code is also used on the server-mode file-import path);
  instead `src/lib/cloud-error.ts` maps codes to UI "kinds," and cloud-specific
  copy lives in the components' own `S` table. 413 -> "30 MB limit," 503/404 ->
  "service unreachable, your save is intact."
- **A testable core was split out:** `describeCloudError` is a pure function,
  `src/lib/cloud-error.test.ts` (6 tests) is picked up by the `npm test` glob,
  the one provable piece of a browser-dependent feature.
- The anonymous flow is entirely unchanged: the third door only renders when
  `auth.backendAvailable` is true, never a gate anywhere else. **The one
  deviation, for the record:** in static mode every onboarding open now fires
  a `GET /api/health` probe, 404 on the anonymous Pages mirror (swallowed, no
  leak to the user, just one console line). Same behavior, one extra network
  request. Second (unmeasured, no behavioral effect) deviation:
  `src/lib/cloud-error.ts` STATICALLY imports `@/lib/backup/cloud` (error
  classes needed for `instanceof`), so `cloud.ts` + `save/seed-strip.ts` now
  also enter the onboarding entry bundle, previously they only arrived
  dynamically via the `cloudPush`/`cloudPull` seams. sql.js is still dynamic,
  so the heavy part is unaffected.

**3 findings found + fixed during merge review:**

1. **A destructive pull went through without confirmation on the wrong read.**
   The original code read `usedLanguages.length === 0` as "local is empty";
   but `usedLanguages` is **curriculum-joined** (`src/core/profile.ts`
   `innerJoin(curricula)`). On a device with an unconfigured LLM, a profile can
   exist without a curriculum, in which case `usedLanguages` looks empty and
   replace-all would run SILENTLY (SRS cards, settings gone). Also, if
   `profileData()` was rejected, it also looked empty, so a transient read
   error would skip the confirmation at the most dangerous moment. Now there's
   `profilesKnownEmpty`: true only if `profileData()` RESOLVES and returns
   zero profiles, defaults false, "unknown" and "unreadable" both prompt.
2. **`getCloudInfo()` was turning every non-404 error into `exists:false`**
   too (403 origin-gate, 500, etc.), so saying "you've never pushed to the
   cloud" would be wrong information, and it would even steer the user to
   start from scratch. Since `cloud.ts` is out of fence, this was resolved on
   the copy side: the text no longer CLAIMS absence ("you may not have pushed
   yet, or the service may be unreachable") and that branch has a "Try again."
3. **`invalidateAuthStatus()` wasn't clearing `inflight`.** If the API address
   was being saved while the first probe (old, against the empty address) was
   still in flight, a stale promise would be returned and its result would be
   permanently written to `cached`, hiding the account UI until a full page
   reload. This is exactly the dev topology (:3000 -> :8787) the field even
   exists for. `inflight` is now also reset, plus a `generation` counter
   prevents a stale probe from writing to `cached`.
4. After the `?cloud=return` marker is read, it's stripped from the URL via
   `history.replaceState`, otherwise the return screen would reopen on every
   refresh.

**Known polish debt (not fixed, not a blocker):** on the return screen, a
user who is ALREADY signed in and clicks "Continue" still sees the intro
screen's "Sign in" door. Account status shows correctly in settings, the flow
doesn't lock up.

**Requires a browser, needs MANUAL verification** (couldn't be run in this
ticket, no permission to run the build, no real Google OAuth client):
`npm run build:static`; a real Google sign-in round trip; on a device with a
profile but NO curriculum, pull should trigger the confirmation dialog (the
case behind finding 1 above); on a freshly loaded page, Settings -> Advanced
-> save API address -> account checks should appear without a full page
reload (finding 3); dismiss the return screen with "Continue" and reload,
normal intro should appear (finding 4).

**Deploy note for the owner (out of fence, but the flow depends on it):** the
site origin must be in the Worker's `TRUSTED_ORIGINS`. If not, better-auth
rejects the callback and the user ends up stuck on a Worker page with NO way
back into the app, the only dead end that can't be recovered with any in-app
exit button.
