---
id: T-065
title: Yuyake leftovers: focus/selected/token cleanup on screens outside the T-053 fence
status: done
priority: p3
effort: S
confidence: high
depends: [T-053]
created: 2026-07-28
---
The T-053 role audit was limited to 5 screens; an agent sweep reported the following rule violations on out-of-scope screens (untouched). All are mechanical: apply T-053's established patterns (line numbers may have drifted, use grep):

1. **Focus formula** (`focus:border-indigo focus:ring-4 focus:ring-indigo/15`):
   - `focus:border-accent`: ChatPanel:169, ConjugatorView:166+182,
     NlConjugatorView:79
   - `focus:ring-accent-soft`: VocabSidebar:249+291
2. **Flash/selected -> indigo** (GrammarSidebar precedent in T-053):
   - flash `ring-accent`: StrokeTrainer:437, VocabSidebar:206
   - selected row/pill `bg-accent-soft`: VocabSidebar:209, StrokeTrainer:369+440,
     CommandPalette:230
3. **Token fixes**: `bg-accent text-white` -> `text-surface`:
   StrokeTrainer:322, ConjugatorView:145, NlConjugatorView:59;
   FloatingOverview:84 `text-white`.

Note: the active-tab/primary-action vermilions on these screens STAY (rule: vermilion = action only) - only the focus/selected/token cases above get reverted.
Verification: tsc + test + build; manual dark/light eyeball per screen.
Reference: `design/okumo-yuyake/README.md` rules + the T-053 diff (`25d813f`).
