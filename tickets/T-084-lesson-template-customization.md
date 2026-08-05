---
id: T-084
title: "Lesson prompt template customization (second phase of transparency)"
status: backlog
priority: p3
effort: M
confidence: low
depends: [T-080]
created: 2026-08-05
---

## Problem

T-080 gives transparency and editing for the curriculum prompt only.
Lesson prompts are assembled per node from a template + live data
(node, completed lessons, struggles), so they cannot be pre-edited per
lesson. Ruling (Burak, 2026-08-05): customization stays curriculum-only
for now; per-lesson dissatisfaction is handled by regenerate-with-feedback
and delete (T-082). This ticket parks the possible second phase: making
the lesson TEMPLATE itself editable (locked slots + locked contract,
editable instruction text), same locked/editable split as T-080.

Do not pick up without an explicit ruling; it may stay closed forever if
feedback-regeneration proves sufficient.
