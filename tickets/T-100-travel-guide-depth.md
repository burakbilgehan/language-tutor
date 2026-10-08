---
id: T-100
title: /travel becomes a full offline handbook (guides, sign kanji, big phrasebook)
status: done
priority: p1
effort: M
confidence: medium
depends: [T-099]
created: 2026-10-08
---
Owner (2026-10-08) on T-099's /travel: "zayıf". Wants grammar-page-sized
content, visuals, the kanji you see over and over (入口/出口...), many more
example sentences. The travel sprint units on the map are untouched; the
owner reviews those at their own pace.

## Shape

- Content model: `src/lib/travel/types.ts`; entry point
  `src/lib/travel/index.ts` (`GUIDES_JA`, `KANJI_GROUPS_JA`,
  `PHRASEBOOK_JA`). All static, tr + en, bracket furigana + explicit romaji.
- Tabs on `/travel` (URL state `?tab=` / `?guide=`): long-form guides
  (block-typed: text, steps, dialogue, phrases, table, tip, signs), sign
  kanji grouped by place (readings come from kanji-index at render time,
  never authored; each card links to `/stroke?char=`), phrasebook with
  replies. One search across all three.
- Sign mockups (`src/components/travel/SignMockView.tsx`) were first drawn
  in design tokens (no green in the design system, vermilion action-only).
  No longer applies; superseded by the owner's call (2026-10-08): "uygulama
  dizaynında yeşil yok diye gerçekte yeşil olan şeyleri silemezsin". Signs
  now use their REAL-WORLD colours (green 非常口/evacuation, yellow exits
  and caution, red prohibition, navy/red bath curtains, wooden plaques).
  Sign colour is content, so the palette rules do not apply inside that
  component.
- No etymology/mnemonic text anywhere (T-088).

## Verification

- `src/lib/travel-content.test.ts`: every L bilingual, no em dash, every
  kanji in Japanese lines bracketed with a kana reading, bracketed words
  and kanji compounds checked against the bundled JMdict subset (mismatch
  fails, absence is printed for hand review).
- One reviewer pass over the content for Japanese correctness and
  naturalness after the mechanical gate.

## Not done

- No practice/flashcard mode for sign kanji (would touch SRS/schema; the
  sprint lessons already feed SRS).
