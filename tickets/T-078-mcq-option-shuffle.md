---
id: T-078
title: "MCQ option shuffle in the code layer (answer is always option A)"
status: todo
priority: p1
effort: S
confidence: high
depends: []
created: 2026-08-05
---

## Problem

LLM-generated mcq exercises almost always place the correct answer as the
first option, so learners pattern-match "pick A" instead of reading. The
fix belongs in the code layer, not the prompt: prompts cannot reliably
control option order, and cached lessons already in the DB carry the bias.

## Work

- Shuffle mcq options at render time with a seed that is stable per
  exercise instance (e.g. hash of node id + exercise index), so re-renders
  and answer feedback don't reorder options mid-exercise.
- Grading compares the selected option's text (string equality against
  `answer`), so shuffling display order is safe; verify this holds on every
  surface that renders mcq (lesson player, review/practice).
- Applies to both server and static modes automatically since this is
  client-side rendering logic.

## Notes

- Deliberately NOT an LLM/prompt change (Burak's call, 2026-08-05): simple
  deterministic randomization in code.
- Keep the shuffle util small and unit-tested (seeded shuffle, stable for
  the same seed).
