---
id: T-097
title: Turkic-specific surfaces: kk/ky selection tooltip + conjugation/declension page
status: backlog
priority: p3
effort: L
confidence: medium
depends: [T-096]
created: 2026-08-20
---
Owner (2026-08-20): "belki bu dillere özel başka sayfalar çıkar". Two
candidate surfaces for the Turkic targets (az/uz/kk/ky/tk), parked until the
T-096 content launch lands and the languages prove themselves.

1. **kk/ky SelectionTooltip**: the global selection tooltip is ja-only today
   (`targetLanguage` gate). For kk/ky it would show the Latin transcription
   via the existing `cyrillic.ts` fold plus an optional LLM meaning lookup.
   Deterministic transcription is free; the lookup reuses the tooltip's
   existing LLM seam.
2. **Turkic conjugation/declension page** (`/conjugate` is ja/zh/nl-gated):
   Turkic languages are agglutinative, so a declension trainer (cases,
   possessives, plural) and a verb conjugation trainer (tense + person) are
   the natural "wow" pages, similar in spirit to the existing conjugate
   views. Static deterministic engine (suffix tables per language, like the
   nl conjugator) rather than LLM.

Both require nav gating changes (`NAV_ITEMS` in StatsHeader) and a design
pass; start after T-096 ships.
