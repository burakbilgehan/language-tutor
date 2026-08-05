---
id: T-079
title: "Meta-prompt curriculum architecture: language-pair-specific prompts written by the deep tier"
status: todo
priority: p1
effort: L
confidence: medium
depends: []
created: 2026-08-05
---

## Problem

Curriculum prompts were written for ja/zh and generalized poorly: Dutch got
alphabet units, pronunciation-check nodes and letter-spotting exercises
("which word has no 'r' sound", "spell 'Eda' with Dutch letter names") in a
no-audio app. Hand-writing guardrail blocks per language does not scale and
still ignores the NATIVE language: SOV/SVO contrast matters for an English
speaker learning Japanese but not for a Turkish speaker; de/het matters for
Turks learning Dutch. Ruling (Burak, 2026-08-05): the curriculum prompt
itself must be generated per (target language, native language) pair.

## Work

Two-stage generation:

1. **Prompt generation (deep tier)**: a meta-prompt takes simple parameters
   (target language, native language, profile: selfLevel, goals, interests,
   motivation, minutesPerWeek) and asks the deep-tier model (`LLM_MODEL_DEEP`
   / quality-profile equivalent) to write the pedagogical body of a
   curriculum-generation prompt tailored to that language PAIR: real
   difficulties of the target language as seen from the native language,
   what to teach early, what question types make sense, what to skip.
2. **Curriculum generation (deep tier)**: the generated pedagogy body is
   wrapped by code with the fixed data contract (JSON schema instructions,
   unit/node counts, xp ranges, level goal line, prior-chapter summary) and
   sent to generate the chapter, exactly where `chapterPrompt` is used now.

Requirements:

- The generated pedagogy prompt is persisted per profile (nullable column
  or json field) and REUSED on every extend; it is not regenerated per
  level. Empty field = generate on first use. Additive nullable schema
  change only; old saves must load unchanged with default behavior
  (Burak's ruling: no save-breaking changes from now on; follow the
  additive self-heal pattern in `src/db/browser.ts` for the browser DB).
- ja/zh move to the same pipeline. Existing generated content and existing
  profiles are untouched; only future generations go through the new path.
  The hand-written ja/zh guardrail knowledge (counters, kana/kanji pacing,
  no-audio rules) should be folded into the meta-prompt as reference
  material so quality does not regress.
- Lesson generation is NOT part of this ticket: lessons keep their current
  template and tiers.
- Fixture mode: add a canned fixture for the prompt-generation call so the
  dev loop stays token-free.
- The 2026-08-05 hotfix blocks in `prompts/curriculum.ts` / `lesson.ts`
  (latinCore, nl/fr extras, the blanket "no pronunciation lesson" rule)
  are superseded by this and should be dissolved into the meta-prompt
  input; the blanket pronunciation ban must NOT survive (see T-081: audio
  is coming, pronunciation lessons become legitimate when backed by TTS
  and real content, e.g. nl ij/ui/g/ch. What stays banned: pronunciation
  QUESTIONS answerable from spelling).

## Notes

- Static mode has no jobs table for the extra call; the two stages run
  inline sequentially there (curriculumGenerate already returns jobless in
  static mode).
- Core logic goes in `src/core/*` per the architecture rule; routes/jobs
  stay thin shells.
- T-080 (transparency/customization UI) builds directly on the stored
  prompt from this ticket.
