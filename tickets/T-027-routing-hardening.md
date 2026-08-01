---
id: T-027
title: Routing hardening, language-switch errors + links falling through to .txt
status: done
priority: p1
effort: M
confidence: medium
depends: []
created: 2026-07-22
---
Fix (2026-07-22): there was a single root cause: `RoadmapView.tsx`
`openLesson`'s basePath-less `pushState("/map?lesson=")` was rewriting the
address bar back to the root. In the static build all `<Link>`/
`router.push|replace` are already basePath-aware (next.config `basePath`);
only raw `window.history.*` and `window.location.href =` skip it. The single
fix: `withBase(\`/map?lesson=${id}\`)`. Sweep: five raw nav points wrapped
with `withBase` across the repo, one (`client-api.ts` /api/save/export) is
server-mode-only (`!IS_STATIC`, no basePath), marked
`audit-routing:allow`. No raw `<a href="/...">` found (confirmed the single
root cause by elimination).

Nav standard (unchanged, confirmed): profile/language switch = full reload
(`window.location.href = withBase("/map")`), all three switch/creation
endpoints comply; entering the add-language form is client nav (no switch
yet), correct.

`.txt` origin (VERIFIED live via chrome + basePath-faithful serve): from a
broken (basePath-less) address, the RSC `.txt` prefetch resolves to the root
(`/map` -> `grammar.txt` = `/grammar.txt` 404; the correct one is
`/language-tutor/grammar.txt` 200), and on 404 the App Router falls through
to plain document navigation to the `.txt`. So #1 and #2 share the same root
cause. (The Next-internal 404->flat-nav STEP is an inference backed by code +
resolve evidence; since the live-click repro requires a profile, the
mechanism was verified via JS, not an end-to-end click.)

Regression guard: `scripts/audit-routing.mjs` (source-level grep, bans bare
paths passed to raw history/location APIs) wired into build-static. Note:
the guard only scans history/location, not raw `<a href>` (Next already
prefixes those) -> that vector was confirmed clean by manual grep.
Symptoms (live = GitHub Pages static build):
1. Routing error on language switch in production (a continuation of the
   T-013/T-014 family, both "done" but the symptom persisted, meaning the
   sweep was incomplete).
2. Clicked pages occasionally go to addresses like `grammar.txt`. Diagnosis:
   Next static export produces an RSC payload as a `.txt` file for every
   route; Link normally fetches it in the background, and when prefetch/
   basePath gets missed somewhere, the browser does a PLAIN NAVIGATION to the
   `.txt`.

Concrete captured example (2026-07-22): `RoadmapView.tsx` `openLesson`,
`window.history.pushState(null, "", "/map?lesson=...")` basePath-less;
on Pages this rewrites the URL from `/language-tutor/map` back to the root
(`/map`). The next navigation/refresh breaks from this. Probably not the only
instance.

Work, one sweep instead of chasing symptoms:
1. Pull every `history.pushState/replaceState`, `router.push/replace`,
   `<Link href>`, `window.location` usage across the repo; audit that all of
   them are basePath-correct in static mode (`withBase` or Next's
   basePath-aware APIs). Write it as a rule: raw history APIs never get a
   bare path.
2. Navigation standard after language/profile switch: which transitions are
   full reload, which are client nav, one decision, every call site follows
   it (including the stale-meta cache from T-013).
3. Capture a repro of the `.txt` navigation (Network tab + which link):
   prefetch 404, a service-worker-less cache, or a basePath-less Link. Don't
   close this without finding the origin.
4. Regression guard: a simple link-audit script for the static build
   (scanning basePath-less internal hrefs in the html inside out/), can be
   wired into build-static.

Verification: on the live site (or `npx serve out` + basePath simulation),
switch language, open/close a lesson, back button, deep-link, the URL should
always stay under `/language-tutor/...`; no single navigation should land on
a `.txt`.
</content>
