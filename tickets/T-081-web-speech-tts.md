---
id: T-081
title: "TTS via Web Speech API: speaker buttons on vocab and examples"
status: done
priority: p2
effort: M
confidence: high
depends: []
created: 2026-08-05
---

## Problem

The app has no audio, which crippled pronunciation teaching and produced
absurd written "pronunciation" exercises. Ruling (Burak, 2026-08-05): add
TTS in the target language; correctness matters, studio quality does not.

## Work

- A small client-side TTS util wrapping `speechSynthesis` (Web Speech API):
  zero cost, no key, works in static mode. Language mapping: nl-NL, fr-FR,
  ja-JP, zh-CN (derive from the profile's targetLanguage; single source,
  no per-surface hardcoding).
- Speaker button next to: lesson vocab items, lesson example sentences,
  and exercise target text where a target-language string is being tested.
  SRS card fronts and vocab/grammar detail examples are natural follow-on
  surfaces; include them if cheap, otherwise note what was skipped.
- Voice availability is probed (`getVoices`, async on some browsers); if no
  voice exists for the target language, the button is hidden, not broken.
- Strip bracket readings (furigana/pinyin notation `漢字[かんじ]`) before
  speaking; speak the base text.

## Notes

- Google Cloud TTS as an optional BYO-key quality upgrade is deliberately
  out of scope (T-085, backlog).
- Voice quality varies by OS; acceptable per ruling ("dogru olsun yeter").
- Unlocks real pronunciation lessons (see T-079: the blanket pronunciation
  ban is lifted once audio exists).

## Resolution (2026-08-06)

- `src/lib/tts.ts`: single-source target-language -> BCP-47 tag mapping
  (ja-JP/zh-CN/nl-NL/fr-FR, en-US dormant until an `en` target exists),
  `speakableText()` (reuses `stripFurigana` from `jp.ts`, does not
  reimplement the bracket regex), async voice probing (`getVoicesAsync`,
  `hasVoiceFor`) and the zh tone-rate helper (`ttsRateFor`).
- Reused the existing `src/components/shared/SpeakButton.tsx` (already
  shipping on `/pinyin` and `/conjugate`) instead of adding a second button
  component. `lang` is now optional: omitted, it derives from the active
  profile via `ttsLangTag`; passed, it keeps the exact literal behavior the
  four pre-existing call sites relied on. Added the hide-until-voice-known
  probe there, so all five surfaces (existing + new) get "hidden, not
  broken" for free.
- Surfaces covered: lesson example sentences (`LessonPlayer.tsx`), the
  `translate` exercise's `targetText` only (mcq/fill_blank targetText is
  the tested material itself per the lesson prompt's own contract; speaking
  it would leak the answer), SRS card
  fronts (`SrsSession.tsx`, always the target-language term), grammar topic
  examples (`GrammarTopicView.tsx`), vocab entry examples
  (`VocabEntryView.tsx`, literal `zh-CN` since vocab is zh-only, T-012).
- Skipped: lesson vocab list. `LessonDto.vocab` exists in the schema but
  is not rendered anywhere in `LessonPlayer.tsx` today; adding a vocab UI
  section would be scope creep beyond a speaker-button ticket.
- Verification: `npm test` (all tts.test.ts pure-function cases pass; one
  unrelated pre-existing `db-reset.test.ts` failure, environmental, not
  touched by this change), `npm run build:static` (clean, no SSR crash from
  `speechSynthesis`), `npx tsc --noEmit` clean, `eslint` clean on all
  touched files.
