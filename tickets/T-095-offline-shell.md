---
id: T-095
title: Offline shell (airplane mode): SW precache + network-less LLM degrade
status: in_progress
priority: p1
effort: M
confidence: high
depends: []
created: 2026-08-14
---
Goal (owner, 2026-08-14): the app must open and be fully usable with ZERO
network. Not "offline PWA with sync", just airplane mode: the UI boots from a
cached static bundle, everything already on the device (IndexedDB save +
packaged seeds) stays readable, no LLM. The first visit must be online (SW
install), which the owner handles.

## Scope

1. Service worker that precaches the ENTIRE static export (`out/`), including
   the packaged seed JSONs (`public/*-seed/*.json`), so a first online visit
   makes every later visit offline-capable.
   - Manifest generated post-build by extending `scripts/build-static.mjs`:
     walk `out/`, inject the file list into `out/sw.js` (source template in
     `public/sw.js` with a placeholder token).
   - Fetch strategy: cache-first for same-origin GETs; navigation requests
     fall back to cached HTML (path, then path+".html", then index.html).
     Never intercept `/api/*` or cross-origin.
   - Registration: production builds only, in the root layout (or a client
     component it renders); `updateViaCache: "none"`; skipWaiting +
     clients.claim so a deployed update takes effect on the next open.
   - Freshness decision (2026-08-14): no Worker-side `Cache-Control` rule for
     sw.js. wrangler 4.114 has no per-asset header config (schema rejects
     `assets.headers`), and the auth-gate test forbids a second pathname
     check in worker/src/index.ts. `updateViaCache: "none"` is the
     spec-backed mechanism that keeps the update check out of the HTTP cache;
     that is sufficient.
2. LLM degrade without network: `navigator.onLine === false` OR a network
   failure must behave like `llm_unconfigured`, not like a hard error:
   - grading -> `needsSelfCheck` seam (already exists),
   - lesson/grammar/etc. generation -> silent no-op / queued state clear,
   - no error storms in UI surfaces that already handle the unconfigured
     case.
   Touch `src/lib/llm/browser-provider.ts` + `src/lib/llm-status.ts` and
   verify every caller of `browserLlmConfigured()` picks the degrade up.
3. Rollback safety: all work on this branch; main stays at 258ad37.

## Acceptance

- `npm run build:static` emits `out/sw.js` with a complete precache manifest.
- Serve `out/` locally, load once online, go offline: reload works, /lesson,
  /grammar, /kanji, /vocab, /settings all render from cache, seeds load.
- With LLM configured but no network, grading degrades to self-check and no
  UI error state appears.
- `npm test`, runtime-purity walker, and the worker tests stay green.

## Result (2026-08-14, code leg)

Done on branch `t-095-offline-shell`, merged to main (deploys):

- `public/sw.js` (template): bounded-concurrency install precache with
  per-file tolerance, PRIORITY order (HTML pages first, then `_next/static`,
  then bulk seeds/wasm) so a partial install still covers every navigation;
  HTML cached under extensionless + trailing-slash + "/" (index) variants so
  navigations hit offline regardless of the host's html_handling redirects;
  self-heal: an interrupted install resumes via a top-up on activate and on
  every fetch while incomplete (skip-if-cached, progress posted to clients);
  activate drops old `okumo-shell-*` buckets + clients.claim; fetch:
  navigations network-first with cached-HTML fallback (path → path+".html" →
  index.html), same-origin GETs cache-first with network fill, `/api/*` and
  cross-origin never intercepted.
- `scripts/build-static.mjs`: walks `out/` (skips `strokes-data`, sw.js,
  .nojekyll), injects manifest into `out/sw.js`; cache name = sha256 of
  base+manifest+template (logic edits get a fresh bucket, identical rebuilds
  don't churn clients).
- `src/components/shared/SwRegister.tsx` + root layout: production-only
  registration, `updateViaCache: "none"`, secure-context guard; mounts on all
  pages including landing; one-time per-version "offline ready" banner when
  the SW reports precache completion (i18n tr/en tables).
- Offline LLM gate: `browserLlmConfigured()` returns false when
  `navigator.onLine === false` unless the endpoint is loopback (Ollama/bridge
  on the same machine keep working in airplane mode). All existing no-LLM
  degrade paths (self-check grading, silent no-op generation) then apply with
  zero network attempts. `useLlmStatus` re-evaluates on online/offline events.
- New test `src/lib/llm/browser-offline-gate.test.ts` (4 cases).
- AGENTS.md: new "Offline shell / airplane mode (T-095)" bullet.

Verified: app tests 254/254, worker vitest 67 pass / 1 pre-existing skip,
eslint clean on changed files, build emits sw.js with 162-entry manifest
(16 html, 12 seed JSONs, sql-wasm included, 0 leftover tokens), all manifest
entries exist on disk and serve 200 from a local static server; owner
verified offline navigation in desktop Chrome against a local static server.

Field note (owner, phone): first field test failed because the precache had
not completed before going offline (ERR_FAILED on navigation). The self-heal
+ readiness banner in this same ticket address that; re-verify by opening
okumo.dev online once and waiting for the banner before airplane mode.

Field note 2 (owner, desktop Chrome + Safari, 2026-08-14): the REAL blocker
was found in the navigation handler. The host's html_handling
(auto-trailing-slash) 301-redirects every page; the SW's plain fetch()
followed those internally and returned `redirected: true` responses, which
browsers reject for SW-served navigations (Chrome: ERR_FAILED, WebKit:
"response served by service worker has redirections"). The local static
server had no redirects, so this never reproduced there. Fixed by following
redirects manually (redirect:"manual", same-origin loop, cap 4) and caching
the final content under both the requested and the final pathname. Shipped
as "T-095: self-healing SW precache + offline-ready banner" + the redirect
fix commit.

NOT verified (needs a real browser on the device, owner): first-online-visit
install → offline reload end to end on iOS Safari; iOS Cache Storage
behavior under suspend/eviction.


