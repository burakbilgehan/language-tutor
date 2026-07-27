# Handoff: Okumo — Sky (mavi) ailesi + marka entegrasyonu

Target repo: `burakbilgehan/language-tutor` (branch `main`) — Next.js + Tailwind v4.

## Overview
The app's existing "cozy" design system (cream / terracotta / moss) gains one new color family: **sky blue** — the color of the Kumo (雲) cloud mascot. Terracotta stays the action color; sky is the information color. This handoff also adds the Kumo cloud mark to the app header.

## About the Design Files
The `.dc.html` files in this bundle are **design references created in HTML** — they show intended look and behavior, they are NOT production code. Recreate the changes in the existing codebase using its established patterns (Tailwind v4 `@theme` tokens, existing component conventions). Open the `.dc.html` files in a browser to view them (keep `support.js` next to them).

## Fidelity
**High-fidelity.** All colors, type sizes, radii and shadows are final and verified 1:1 against the repo's `src/app/globals.css`.

## Tasks

### 1. `src/app/globals.css` — add the sky family
Paste the contents of `globals-sky-additions.css` into the matching blocks. **Important:** dark tokens are defined in TWO places in this file — the `.dark` class AND the `@media (prefers-color-scheme: dark) { :root:not(.light) }` block. Add the dark sky values to BOTH. No existing token changes.

Also add the `.prose-cozy a` rule (link color = sky role).

### 2. `src/components/shared/CozyButton.tsx` — new `info` variant
```tsx
type Variant = "primary" | "ghost" | "soft" | "info";

const styles: Record<Variant, string> = {
  /* …existing three variants unchanged… */
  info: "bg-sky text-surface hover:brightness-110 shadow-cozy disabled:opacity-40",
};
```

### 3. `src/components/shared/StatsHeader.tsx` — Kumo mark
Add the cloud mark left of the app title, ~28px tall, vertically centered, `gap: 10px` from the title:

```html
<svg viewBox="0 0 128 86" height="28" aria-hidden="true">
  <g fill="var(--accent)">
    <circle cx="40" cy="44" r="22"/><circle cx="68" cy="34" r="27"/>
    <circle cx="94" cy="47" r="18"/><rect x="18" y="44" width="94" height="22" rx="11"/>
  </g>
  <rect x="30" y="74" width="26" height="7" rx="3.5" fill="var(--sky-light)"/>
  <rect x="64" y="74" width="42" height="7" rx="3.5" fill="var(--sky-light)"/>
</svg>
```
Using `var(--accent)` / `var(--sky-light)` makes it adapt to dark mode automatically.

## Color usage rules (enforce in any UI you touch)
- **Sky = information & state:** links, tips, "how it works" boxes, progress bars, the Kumo mascot, calm info banners, selected/focused states.
- **Terracotta = action & energy:** primary button, active tab, playable lesson node, unit label, celebration. Max **one** dominant terracotta focal point per page.
- Focus style: `border` 1.5px `--sky` (#4f93b0) + ring `rgb(79 147 176 / .15)` 4px.
- Never white cloud mark on light backgrounds (white-on-cream fails).

## Design Tokens (new only — existing tokens unchanged)
Light: `--sky-50 #eaf3f7 · --sky-soft #d6e8f0 · --sky-light #7fb9d1 · --sky #4f93b0 · --sky-deep #3a7691`
Dark: `--sky-50 #1d2a31 · --sky-soft #2b3d47 · --sky-light #5f9cb5 · --sky #8fc7dc · --sky-deep #b6dcea`
(Scale intentionally inverts in dark mode: `sky-deep` becomes the lightest, for text on dark.)

Everything else (spacing 4/8/12/16/24/32, radius 8/16/20/full, `--shadow-cozy`, Fraunces/Nunito Sans scale, CJK 1.55em rules) already exists in the repo — do not re-add.

## Files in this bundle
- `globals-sky-additions.css` — copy-paste blocks for task 1
- `Okumo Design System.dc.html` — full token/component reference (section 07 = implementation code)
- `Okumo Ekranlar Önce Sonra.dc.html` — before/after mocks: roadmap, lesson, grammar, onboarding, settings
- `Okumo Marka.dc.html` — logo, tone of voice, usage do/don't rules
- `Okumo Landing.dc.html` — okumo.dev landing page reference (separate scope, not part of tasks 1–3)
- `support.js` — runtime for viewing the .dc.html files in a browser
