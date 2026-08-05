---
id: T-083
title: "Granular placement: start mid-level, not just at a chapter boundary"
status: backlog
priority: p3
effort: L
confidence: low
depends: [T-082]
created: 2026-08-05
---

## Problem

Level-based starting (T-082) is coarse: 6 CEFR levels over ~150 lessons
means the real starting point ("lesson 17") falls inside a chapter. A
learner slightly above A1 must either redo A1 or skip to A2 and miss the
tail of A1. Burak flagged this as a real but deep problem (2026-08-05);
parked deliberately.

## Direction (undecided)

Options to explore when picked up: a short placement test (LLM-graded)
that marks leading units as completed; or per-unit "mark as known" on the
map; or generating the starting chapter with a "the learner already knows
X" summary. Needs a design pass; do not implement without a ruling.
