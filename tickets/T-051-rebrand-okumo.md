---
id: T-051
title: Rebranding - product name becomes okumo, Kumo stays as mascot/assistant
status: done
priority: p2
effort: M
confidence: medium
depends: []
created: 2026-07-27
---
The product name is now **okumo** (domain okumo.dev, 2026-07-27). **Kumo** is
NO LONGER the product name; it stays as a cloud-mascot / chat-assistant
persona (a visual mascot may be added later). Brand story: "kumo" is hidden
inside "okumo" (o-kumo); Kumo = 雲, cloud, fits the cloud-sync theme.

Burak is currently working on branding with Claude design; assets (logo,
favicon, color/typography refinement, mascot art, OG image, tagline) will
GROW this ticket as they arrive. Below is the skeleton + inventory.

## CRITICAL scope distinction (agent must NOT blind-replace)

**A) Product-name surfaces -> "Kumo" becomes "okumo":**
- `src/app/layout.tsx:22` - `title: "Kumo - Your Language Journey"` (+
  metadata block: description / openGraph / applicationName if present)
- `package.json` `name` ("language-tutor" -> okumo)
- `README.md` title/description
- `CLAUDE.md` project title (the line with the product name)
- Manifest / PWA app title (if any)

**B) Kumo = persona/assistant -> DO NOT TOUCH (mascot, stays where it belongs):**
- `src/components/chat/ChatPanel.tsx:18,30` - "Kumo ile Sohbet" ("Chat with
  Kumo") / "Chat with Kumo"
- `src/lib/llm/prompts/chat.ts:14,26,29` - "Sen Kumo'sun" ("You are Kumo") /
  "Kumo olarak cevap ver" ("respond as Kumo")
- `src/components/onboarding/OnboardingWizard.tsx:133,223` - "Ben Kumo"
  ("I'm Kumo")
- `src/components/lesson/LessonPlayer.tsx:25,72` - "Kumo bu dersi yazıyor"
  ("Kumo is writing this lesson")
These are the assistant character = mascot. If Burak wants to change them too,
that's a separate decision.

**C) Infrastructure names (optional, separate work):**
- `src/components/shared/FeedbackButton.tsx:18,178` -
  `kumo-feedback.*.workers.dev` URL + `kumo-feedback.png`. Renaming the Worker
  means a deploy step + breaking the URL. Not part of the rebrand; separate if
  wanted.

## Growing part (as Burak supplies assets)
- Logo + favicon + app icon (replacing the current `public/*.svg`)
- OG/Twitter card image (for okumo.dev shares)
- Tagline (currently "Dil Yolculuğun" [Your Language Journey], staying?)
- Color palette / typography refinement (current cream/terracotta/moss +
  Fraunces/Nunito, does it fit the okumo identity, will it be adjusted?)
- Kumo mascot art (a cloud character; must be clearly designed as "cloud" so
  it doesn't evoke the JP homophone 蜘蛛, spider); later, could be separate.

Note: effort may grow M->L once asset integration lands. Inventory (A) is
mechanical (sonnet); asset + copy revision is design-sensitive.

## Visual identity SPLIT OUT (2026-07-27, Claude design handoff arrived)
The `design/okumo-sky/` handoff brought color/mark/landing, so visual work
moved to separate tickets: **T-052** (sky color family + Kumo mark SVG + info
variant), **T-053** (sky usage rules, 5 screens), **T-054** (okumo.dev
landing). This ticket (T-051) is left with ONLY **the name change + brand
copy/tone**:
- (A) product-name surfaces -> okumo (inventory above)
- Tone of voice + logo do/don't -> applied from
  `design/okumo-sky/Okumo Marka.dc.html` (brand voice reflected in copy).
The Kumo mascot art is no longer abstract: the header mark arrives in T-052
(cloud SVG). T-051 = textual identity, T-052/53 = visual system.
