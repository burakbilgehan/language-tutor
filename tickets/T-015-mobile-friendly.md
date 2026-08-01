---
id: T-015
title: Mobile-friendly pass (responsive pass)
status: done
priority: p2
effort: L
confidence: medium
depends: []
created: 2026-07-18
closed: 2026-07-18
---
Never looked at until now; the site is live and may be broken/cramped for
anyone opening it from a phone. Goal: an app that's comfortable to use on a
phone.

Scope (surfaces to audit):
- Nav/header (StatsHeader + tabs, overflow likely on narrow screens)
- Roadmap/map view
- Lesson + exercise flow (inputs, layout when the keyboard opens)
- Grammar / Vocab / Kanji master-detail pairs, sidebar+detail side by side
  won't fit on mobile, needs stack or drawer
- Conjugation, Pinyin, Kana, Review, Chat, Settings, Onboarding

Suggested approach: instead of one big PR, go page by page (nav + lesson +
master-detail pattern first; once the pattern is solved once, grammar/vocab/
kanji all get the same fix). Solve with Tailwind breakpoints (target below
`sm:`); don't write a separate mobile layout. Shared layout components like
`CenteredPage` are the leverage point.

Verification: Chrome devtools device emulation (390px) + a real phone against
the Pages live site. Effort L because the surface is large; individual pages
are S.

## Outcome (2026-07-18)

Before planning, code was read with fable-planner: most of the premise turned
out wrong. Grammar/vocab layout already stacks on mobile via the `?topic=`/
`?word=` URL-gate (not a drawer, the right call), stroke trainer already uses
`lg:flex-row`, the map lesson panel is already `w-full` on mobile.
Conjugation/pinyin tables are inside `overflow-x-auto`, the page doesn't
overflow.

The actually broken point: **map bubbles**, `translateX(sin*90)` with a fixed
amplitude was overflowing the label at 320-375px screens (analysis: at 386px
the margin was 31px, at 320px it went negative). Fix: scaled the amplitude to
the viewport with `min(90px, 18vw)` (`RoadmapView.tsx`).

Another minor improvement: onboarding card padding `p-8` -> `p-5 sm:p-8`
(cramped at 320px, not broken).

Verified/untouched: header height (101px, consistent on mobile), lesson input
flow (normal flow, no keyboard issue), chat composer (`sticky bottom-4` +
`dvh`, code read looks fine but **not verified on a real device**, the
Chrome resize_window tool didn't actually change the viewport in this
session, it just gave a consistent result on the first attempt; the
remaining steps were done via code reading + mathematical verification),
settings/onboarding grids (text wraps, no clipping).

Still open: no verification on a real phone against the live site (Pages) was
done, that's a user step.
</content>
