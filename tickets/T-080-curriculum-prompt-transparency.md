---
id: T-080
title: "Curriculum generation transparency: show the prompt, let the user edit the pedagogy"
status: todo
priority: p1
effort: M
confidence: medium
depends: [T-079]
created: 2026-08-05
---

## Problem

Curriculum generation is a black box: the user cannot see what will be sent
to the LLM, cannot correct a bad pedagogical framing, and only discovers
garbage after 2-5 minutes of generation. Ruling (Burak, 2026-08-05): full
transparency as an OPTION at curriculum creation time.

## Work

- Before curriculum generation starts (onboarding wizard final step and the
  regenerate flow), offer two doors: "Generate with the recommended prompt"
  or "Customize".
- Customize shows the exact prompt that would be sent (the meta-prompt
  output from T-079): the pedagogy body is freely editable in a textarea;
  the data-contract section (JSON schema instructions, counts, xp ranges)
  is VISIBLE but LOCKED (read-only), so the user sees everything but cannot
  break parsing. Non-negotiables locked, the rest customizable (Burak's
  wording).
- The edited body is what gets persisted to the profile (T-079's storage),
  so extends reuse the user's edit.
- Scope limit (explicit ruling): customization exists ONLY for curriculum
  generation. Lesson prompts are not customizable; dissatisfaction with a
  lesson goes through regenerate-with-feedback (T-022) and delete (T-082).
- i18n: tr + en string tables per the co-located `S` convention.

## Notes

- Both modes: server (wizard calls the job) and static (inline generate).
- Keep the editor dumb: plain textarea, no syntax highlighting, no
  templating UI.
