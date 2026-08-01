---
id: T-053
title: Yūyake usage rules - apply to 5 screens (vermilion=action, indigo=info/success/state, amber=reward)
status: done
priority: p2
effort: M
confidence: medium
depends: [T-052]
created: 2026-07-27
---
Once T-052's palette migration is done, the README's "Color usage rules" +
DS v2 section 04 (component color roles) get applied to the existing
screens. Unlike v1, v2 has no separate before/after mock FILE; the token
migration + T-052's sweep mechanics already handle that. This ticket is
judgment work (not blind find-replace):

- **Vermilion = action only:** primary button, active tab, an openable lesson
  node, unit badge, celebration. **ONE** dominant vermilion focus max per
  page; anything more that is actually info/state work gets pulled to indigo.
- **Indigo = info+success+state:** completion marks, progress, links,
  hint/info boxes, selected/focus state (1.5px `var(--indigo)` border + 4px
  `rgb(47 74 112 / .15)` ring), the Kumo mascot.
- **Amber = reward:** XP, streak, badges; use `--amber-text` on light
  backgrounds.
- No green. No pale pastel blue.

Screens (fence): Roadmap (`/map`), Lesson (`LessonPlayer`), Grammar
(`GrammarTopicView`/`GrammarTable`), Onboarding (`OnboardingWizard`),
Settings. T-052's files (globals/CozyButton/StatsHeader) are only touched if
a rule requires it, and only after T-052 is merged. Out-of-scope screens
(vocab/conjugation/SRS/kana/stroke/exam/chat/about) get auto-updated from the
tokens; if you see a rule violation there, DO NOT TOUCH it, report it instead
(precedent T-055: becomes its own small ticket).

Reference: `design/okumo-yuyake/README.md` + DS v2 html sections 01/04.
Verification: rule audit on 5 screens in both dark/light + `tsc` + tests +
build. Visual check remains manual.

## History
- The v1 "sky" implementation was merged 2026-07-27 and reverted the same day
  (`244ec86`). Rescoped with the v2 Yūyake handoff (rule-based instead of
  mock-matching).
- **Done 2026-07-28**: `25d813f`, 14 files. Role audit across 5 screens: the
  focus formula (border-indigo + ring-indigo/15) on all inputs (CloudAccount
  had none at all, added), selected states are indigo, info banners are
  indigo-soft, links are text-indigo, loading dots are indigo, XP is
  amber-text; `text-white`->`text-surface` and `text-red-500`->`text-danger`
  token fixes. Dominant vermilion per screen: map=playable node,
  lesson=Check/Continue, grammar=active level pill, onboarding=Continue,
  settings=primary CozyButtons. Evidence: tsc clean, 111/111 tests, build
  green in the worktree, focus formula + `--color-indigo` verified at runtime
  in compiled CSS. Explicit judgment call: MCQ option hover STAYED
  accent-soft (answering is the page's primary action, orchestrator approved;
  one line to reverse if wanted). Manual visual dark/light check remains.
  Out-of-scope leftovers -> T-065.
