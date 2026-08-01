---
id: T-076
title: Question text (promptTr) skips furigana rendering: raw brackets show through
status: todo
priority: p2
effort: S
confidence: high
depends: []
created: 2026-08-01
---

## Problem

Bracket notation (漢字[かんじ]) is the WIRE format; in the UI, the `Furigana`
component renders it as ruby text above the kanji. The design is correct (an alignment problem: a separate reading field would require client-side morphological analysis; this is also the approach Anki uses). BUT `LessonPlayer.tsx:692` renders the question text
(`exercise.promptTr`) RAW without passing it through Furigana: on questions containing a Japanese fragment (「母」の 読[よ]み方[かた]は...), the user sees the brackets on screen (2026-08-01 complaint).

## Work

1. Pass `promptTr` through `Furigana` rendering (cjkLang is already available
   in the component; Furigana should be a no-op when the target language isn't ja/zh).
2. One-pass audit: check every surface that renders LLM-sourced text that might
   contain brackets (SRS card faces, review practice, chat, selfCheck, the fill_blank gapped sentence, feedback) - do they all go through Furigana? List the ones that don't and fix them in the same PR.
3. Don't touch the grading side: answers.ts's symmetric bracket-stripping
   (T-044) behavior must not change.
