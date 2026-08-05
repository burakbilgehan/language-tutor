---
id: T-081
title: "TTS via Web Speech API: speaker buttons on vocab and examples"
status: todo
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
