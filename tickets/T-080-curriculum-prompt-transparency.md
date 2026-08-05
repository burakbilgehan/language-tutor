---
id: T-080
title: "Curriculum generation transparency: show the prompt, let the user edit the pedagogy"
status: done
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

## Resolution (2026-08-06)

Shipped in wave C2. `chapterPromptParts` (`src/lib/llm/prompts/curriculum.ts`)
splits the chapter prompt into `{system, before, pedagogy, after}` and
`chapterPrompt` is now literally `before + pedagogy + after`, so the UI renders
the exact bytes generation sends; verified byte-identical to the pre-split
prompt. `PromptCustomizer` (`src/components/curriculum/`) shows the system
instruction and both contract halves read-only and the pedagogy body in a plain
textarea. Two doors at BOTH generation entry points: the onboarding final step
and the map hub's `notReady` card. In onboarding the Customize door creates the
profile first (the pedagogy prompt is built from the profile row), reusing it
via `createOrReuseProfile` if the user cancels.

Core: `previewCurriculumPrompt` / `saveCurriculumPedagogy` /
`inspectStoredPedagogy` in `src/core/curriculum-gen.ts`, behind POST/PUT
`/api/curriculum/pedagogy` (server) and the `client-api.ts` `IS_STATIC` seam
(static). The stored `CurriculumPedagogy` json gains an additive
`edited?: true`; NO new DB column, NO SAVE_SCHEMA_VERSION bump, and values
stored before T-080 lack the field and behave exactly as before.

Answering T-079's open question about staleness: `readStoredPedagogy` keeps a
hand-edited body when the language-pair stamp goes stale (user input is never
silently destroyed) and surfaces the mismatch in the UI with an explicit
"rewrite it" button; an unedited stale body is still discarded and regenerated
as before. Seven unit tests in `src/lib/curriculum-pedagogy-staleness.test.ts`
pin that truth table.

Deliberately NOT covered: the extend flow (`startExtend`) has no Customize
door. The ticket scopes this to curriculum generation, and an edited body is
reused by every extend anyway, so the wording is customizable before the
curriculum exists and stays in force from there on.
`previewCurriculumPrompt` still accepts an explicit `level` so an extend-side
door can be added later without touching core; both wired doors pass none,
which mirrors `generateChapter(levelArg=null)` = the scheme's first level.

Verified: `npm test` (227 pass, 7 of them the new staleness truth table),
`npm run build:static`, the sql.js parity harness (its T-079 assertions
included), and a fixture-mode exercise of the whole customize path (23
assertions) covering preview, edit, save, reject-too-short, generate-with-edit,
stale-keep, force-regenerate and unedited-stale-discard. Real-browser
click-through of the two doors was not performed; that remains manual.
