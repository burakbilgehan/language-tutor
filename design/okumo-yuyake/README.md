# Handoff: Okumo v2, "Yuyake" palette migration (Samurai Champloo direction)

Status: applied (see [T-052](../../tickets/T-052-yuyake-palette.md), [T-053](../../tickets/T-053-yuyake-usage-screens.md)). This file remains the design source of truth for tokens and color roles.

Target repo: `burakbilgehan/language-tutor` (branch `main`), Next.js + Tailwind v4.

## Overview
Palette v2: depth over saturation. Terracotta -> **vermilion** (#c14a1d), moss green **removed**,
replaced by the **aizome indigo** family (info + success + state), gold -> **amber** (reward).
The background warms up slightly. Since the app is token-based, most screens update
automatically; only the class sweep below is needed.

**Note:** the earlier "add a sky family" handoff (v1) is void. If it was applied, remove
the `--sky-*` tokens and any `bg-sky*` usage during this migration.

## About the Design Files
`Okumo Design System v2.dc.html` is a **design reference** written in HTML, not production
code. Open it in a browser (keep `support.js` next to it). Section 01 is tokens, 04 is
component color roles, 07 is the migration guide.

## Fidelity
**High-fidelity.** All values are final; `globals.css` in this folder is drop-in ready.

## Tasks

### 1. `src/app/globals.css`: full replacement
The `globals.css` file in this folder is a drop-in replacement (generated from the actual
source: `--header-h`, CJK rules, prose-cozy, animations preserved; color tokens + shadow +
pulse-glow color + `.prose-cozy a` are new). Dark values live in both the `.dark` class AND
the `prefers-color-scheme` block; both are current in the file.

Token change summary:
- `--accent` #c4643b -> **#c14a1d** (dark #d97e55 -> #e07b3f)
- `--moss`, `--moss-soft` **removed** -> `--indigo-soft/-mid/--indigo/--indigo-deep` added
- `--gold` -> **`--amber`** (#e8a13c) + `--amber-text` (#b07414 for contrast on light; #e8a13c on dark)
- background: #f7f2e9 -> #f6ead2, surface -> #fdf6e7, ink -> #251e18 (dark: #201b16 -> #1c1712 family)
- `--danger` #b2503f -> #8f3116 (dark #d96a4a)

### 2. Class sweep: moss/gold -> indigo/amber
Mapping: `bg-moss`->`bg-indigo` , `bg-moss-soft`->`bg-indigo-soft` , `border-moss`->`border-indigo` ,
`text-moss`->`text-indigo` , `bg-gold`->`bg-amber` , `text-gold`->`text-amber-text` , `ring-gold`->`ring-amber`.

Known usage sites (verify with grep):
- `LessonPlayer.tsx`: 388 (text-moss), 491 (bg-moss), 519 (border-moss bg-moss-soft), 636 (bg-moss-soft), 642 (text-gold)
- `RoadmapView.tsx`: 412 (bg-moss-soft), 456 (bg-moss text-surface), 472 (text-gold)
- `SrsSession.tsx`: 53 (bg-gold/15, hover /25), 54 (bg-moss-soft), 177 (bg-moss)
- `JobQueuePanel.tsx`: 104 (text-moss), 108 (text-gold), 189 (bg-gold/20 text-gold hover /30)
- `StatsHeader.tsx`: 86 (text-moss), 123 (bg-gold), 243 (text-gold)
- `StrokeTrainer.tsx`: 442 (bg-moss-soft), 483 (text-moss), 167-168 (cssVar fallback `"#c4643b"` -> `"#c14a1d"`)

Warning: the `gold` at `src/lib/conjugation/nl.ts:132` is a Dutch verb (gelden); **do not touch it**.

### 3. `src/components/shared/CozyButton.tsx`: `info` variant
```tsx
type Variant = "primary" | "ghost" | "soft" | "info";
// the existing three variants stay as-is (colors come from tokens)
info: "bg-indigo text-surface hover:brightness-110 shadow-cozy disabled:opacity-40",
```

### 4. `src/components/shared/StatsHeader.tsx`: Kumo mark
To the left of the title, ~28px, `gap: 10px`:
```html
<svg viewBox="0 0 128 86" height="28" aria-hidden="true">
  <g fill="var(--accent)">
    <circle cx="40" cy="44" r="22"/><circle cx="68" cy="34" r="27"/>
    <circle cx="94" cy="47" r="18"/><rect x="18" y="44" width="94" height="22" rx="11"/>
  </g>
  <rect x="30" y="74" width="26" height="7" rx="3.5" fill="var(--indigo)"/>
  <rect x="64" y="74" width="42" height="7" rx="3.5" fill="var(--indigo)"/>
</svg>
```

## Color usage rules
- **Vermilion = action:** primary button, active tab, an unlockable lesson node, unit label,
  celebration. At most **one** dominant vermilion focus per page.
- **Indigo = info + success + state:** completion marks, progress, links, hints, focus state
  (border 1.5px `var(--indigo)` + ring `rgb(47 74 112 / .15)` 4px), the Kumo mascot.
- **Amber = reward:** XP, streak, badges. On a light background, text uses `--amber-text`.
- No green. No pale pastel blue.

## Scope note
Mocked screens: map, lesson, grammar, onboarding, settings (+ landing). Screens not covered
(vocab, conjugation, review/SRS, kana, stroke, pinyin, exam, chat, about) update automatically
from tokens; the sweep in task 2 catches their leftover moss/gold. If unsure, reference: DS v2
sections 01 and 04.

## Files in this bundle
- `globals.css`: drop-in replacement (task 1)
- `Okumo Design System v2.dc.html`: token + component reference
- `support.js`: runtime for viewing the .dc.html file
