---
id: T-056
title: No-LLM flow broken + instant static content on first open (augmentation model)
status: done
priority: p1
effort: M
confidence: high
depends: []
created: 2026-07-27
---
URGENT. Two phases: Phase 1 is a live bug (immediate), Phase 2 is an
architectural fix.

**Status update (2026-07-27):** Phase 1 MERGED (`d791e63` + `53c65da`,
onboarding now catches `llm_unconfigured` and falls through to /map,
RoadmapView shows the empty-roadmap state). Remaining scope = Phase 2 only.
Related: T-060 (wizard redesign) makes "Continue without connecting" a
first-class door; this ticket's Phase 2 is the back side of that door.

**Closure (2026-07-27, solo wave):** Phase 2 also merged (`b330e6c` / merge
`2cf0ae6`). Rulings (Burak): **B, the cheatsheet hub** (a scaffold curriculum
was rejected; flip: if packaged seed ships for lesson content itself, A comes
back on the table). The no-curriculum state of `/map` is now a
language-aware library hub (cards from `visibleNavItems`, excluding
lessons/review/chat) + "Generate curriculum" if LLM is connected, else
"Connect LLM." The entry screen has four doors, reordered: guided setup
(primary) / load save / cloud sign-in / **anonymous start** (one question:
target language, since it's immutable and can't be defaulted; everything else
defaults and is customizable from Settings; the anonymous path doesn't
auto-generate a curriculum even with LLM connected, the trigger lives in the
hub). Extra fix `40250c0`: the grammar/vocab sidebars were masking a load
error as an empty list (with the misleading copy "once the curriculum is
ready..."); the error now shows a retryable state. The en-native seed gap
became **T-064**.

**Core principle (Burak):** connecting an LLM + personalization is an
**augmentation**, not a prerequisite. Static content is always ready
(grammar/kanji/vocab seed on the CDN + packaged seed,
`applyGrammarSeed`/`applyKanjiSeed`/`applyVocabSeed`). The user should see
content INSTANTLY both on first opening the site AND right after setup
finishes; the LLM comes later and adds lessons/a personal curriculum.

## Phase 1 - "Continue without LLM" broken (live bug, urgent)
The last onboarding step unconditionally calls
`curriculumGenerate(profile.id)` (`src/components/onboarding/OnboardingWizard.tsx:531`),
which is LLM-gated. When "continue without LLM" is chosen while the LLM
isn't connected, this call errors with "connect an LLM" and LOCKS the flow.
"Continue without LLM" is important and must work correctly: if there's no
LLM, curriculum generation should be SKIPPED, and the user should land in a
static-content start (Phase 2 below) without getting stuck. Verification: a
clean browser -> open the site -> "Continue without LLM" -> content should
appear with no error.

## Phase 2 - Instant static content on first open + after setup
A valuable starting state for a no-LLM user:
- **Grammar cheatsheet** (language-wide index + packaged seed, fully ready
  without LLM), **dictionary/vocab** (zh), **kanji** (ja): all instantly
  browsable.
- What should `/map` (roadmap) show without LLM? Curriculum is
  LLM-generated, so either a static "scaffold" curriculum (seedable?) or an
  explicit "connect an LLM for lessons" state plus live content in the
  meantime pointing to the cheatsheet/dictionary. Do NOT show a blind empty
  /map.
- First open: a sense of access to the static library even before entering
  onboarding (or immediately after starting anonymously).
- Once an LLM is connected, personalization (curriculum + lessons) is added
  as augmentation; the existing curriculumGenerate/ensureLesson flow kicks in
  once the LLM arrives.

Decision point (to be settled during the fix session): what a no-LLM
"roadmap" looks like, a static scaffold curriculum or a cheatsheet-centered
entry point. The existing `llmConfigured()` / `useLlmStatus` gates
(`src/lib/llm/config.ts`, `src/lib/llm-status.ts`) already exist for
"no-LLM degrade"; build this flow on top of them, don't invent a new gate.

Fence: end of `OnboardingWizard.tsx` + `/map` (roadmap) first render +
probably the curriculum path in `client-api.ts`. Model: **opus** (Phase 2 is
architectural judgment, designing the no-LLM start state, not blind
find-replace).
