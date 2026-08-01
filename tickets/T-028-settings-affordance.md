---
id: T-028
title: Settings button can stay in the corner but should signal its purpose
status: done
priority: p3
effort: S
confidence: high
depends: []
created: 2026-07-22
---
The gear icon in the top right is too small; Settings is an important page
(LLM setup, save export/import, profile management all live there). Decision
(Burak): it stays in the corner, should NOT become a nav tab, but shouldn't
stay small and should better signal its purpose.

Work (StatsHeader):
- Bring the gear to the same visual weight as the other chips in the header
  ($0.00, ⌘K): chip shape + "Ayarlar" ("Settings") label (the label drops on
  narrow screens, the icon stays big). Tap target >= 44px.
- When the LLM isn't configured (useLlmStatus), add an attention state to the
  chip (dot/color), that's the moment new users most struggle to find
  Settings.
- i18n: co-located S table (tr/en), existing pattern.

Verification: visual check at desktop + mobile widths; see the chip draw
attention on first open with an LLM-less clean profile.
</content>
