---
id: T-075
title: Coverage ledger: a deterministic summary in the lesson prompt instead of a raw question list
status: todo
priority: p1
effort: M
confidence: medium
depends: []
created: 2026-08-01
---

## Problem

To avoid repetition, the lesson prompt embeds the student's previous questions as RAW TEXT (`recentExercisePrompts`, last 30) plus a list of completed lesson names (last 12). There are caps, so the prompt doesn't grow unbounded; but the approach leaks in three places:

1. Once the 30-question window fills up, older questions fall out of the dedupe
   and can be asked again.
2. Raw question text (with bracketed furigana) adds noise to the prompt and
   nudges the model to imitate those patterns.
3. It carries "what and how much the student has learned" through the crudest
   possible proxy (question text); there's no coverage information at the item/direction level (recognition vs. production).

## Work

A deterministic coverage ledger: a compact summary derived by CODE from the
`exercises` + `attempts` (+ SRS card) tables - per item, how many times and in which direction (recognition/production) it was tested, and recent scores. The lesson prompt gets this summary instead of a raw question list ("these items have already been asked 2+ times, find a new angle: ..."). Zero LLM cost, unlimited scale, dedupe spans the entire history rather than a window.

- Core: `src/core/*` (env-agnostic, identical in both modes), next to
  struggles.ts; consider merging into a single "student context" block together with `getStrugglesLine`.
- The raw `recentExercisePrompts` list is removed (the prompt gets simpler).
- Measurement: eyeball-compare question repetition across two lessons generated for the same node; prompt token count should drop.

## Relationship

Complementary to T-071 (fast skeleton + background-completed exercises):
T-075 feeds WHAT to ask, T-071 splits WHEN it gets generated. The idea of pre-generating skeletons for all lessons during curriculum generation was deliberately REJECTED: it would bloat curriculum generation and leave the skeletons blind (and stale) to the student's actual progress (struggles, feedback).
