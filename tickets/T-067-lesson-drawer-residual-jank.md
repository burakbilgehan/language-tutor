---
id: T-067
title: Residual scroll jank in the lesson drawer: raster cost (rounded clip / shadow suspected)
status: backlog
priority: p2
effort: S
confidence: medium
depends: []
created: 2026-07-31
---
2026-07-31 field measurement (long-animation-frame, the user's real scroll): with the lesson drawer open there was ~80-100ms of pure paint per frame; script=0, style/layout=0. Two fixes shipped and produced a noticeable improvement, but Burak said "better, but still not smooth":

- `de7e32a`: removed the `backdrop-blur` on LessonPlayer's embedded sticky header (backdrop-filter inside the scroller was canceling the compositor's fast path) + in RoadmapView, the drawer's opening animation changed from `transition-[padding]` to `transition-transform` (padding was relayouting the whole map every frame).
- `20665d3` (related but separate): useLocalizeError identity stabilization - fixed an infinite render/fetch loop (a tab-killing bug).

## Remaining work
The remaining jank went unmeasured before the session closed. Next candidates (untested):

1. The `sm:rounded-l-3xl` corner clip on the drawer scroller - a rounded clip can block composited scroll in some cases.
2. The drawer's `shadow-cozy` (a large blurred box-shadow).
3. The remaining `backdrop-blur` on StatsHeader (smooth on its own on the map, but not verified with the drawer open and interacting).
4. The map's `animate-pulse-glow` (a box-shadow keyframe animation; continuous repaint) - still running while the drawer is open.

## Measurement method (ready to use)
While the tab is IN THE FOREGROUND (rAF throttles to 1fps in the background, making measurements garbage): set up a rAF frame-interval recorder plus a `long-animation-frame` observer; for a live A/B on the page, apply `panel.classList.remove("sm:rounded-l-3xl","shadow-cozy")` and compare two recordings against the user's own scroll. If script/style time keeps coming out at zero, the culprit is raster, not React; chasing "inefficient render" is a waste of time (the 2026-07-31 measurement already proved this once).
