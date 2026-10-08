---
id: T-096
title: Turkic languages launch (az/uz/kk/ky/tk): content generation + ship
status: backlog
priority: p1
effort: L
confidence: high
depends: []
created: 2026-08-20
---
Goal (owner, 2026-08-20): five Turkic target languages added to the app
(Azerbaijani, Uzbek, Kazakh, Kyrgyz, Turkmen), learnable from Turkish native
only for now. The skeleton is done in code; this ticket tracks the content
pipeline work that ships the languages for real.

## Parked (2026-10-08)

The code below is NOT on main. Owner shelved the Turkic launch to focus on
the Japan trip; the full skeleton is committed on branch
`wip/turkic-languages` (one WIP commit on top of 2c0447a). Re-land it
(rebase onto main, rerun `npm test`) before starting "Remaining" step 1.
The AGENTS.md "Turkic languages" and "Blast's LLM is configurable" notes
live on that branch too and return with it.

## Done in code (2026-08-20, on branch wip/turkic-languages)

- `LANGUAGES` +5 (profile-options), `ProfileMeta` union extended.
- tr-only restriction: `TR_ONLY_TARGETS`/`isTrOnlyTarget` (profile-options),
  `assertNativeAllowed` in core/profile.ts (AppError `native_restricted`),
  enforced on create + patch; onboarding wizard (step 0 native cards locked,
  anon door forces tr, intro switch resets target) and Settings
  (freeLanguages filtered, native edit locked).
- Grammar index skeleton for all 5 (full A1-C2, ~60-70 topics each,
  `src/lib/grammar-index/{az,uz,kk,ky,tk}.ts`) + dispatch + empty
  `titles.*.en.json` placeholders.
- kk/ky Cyrillic support: lesson/grammar prompts emit Latin transcription in
  bracket notation (Мен[men]); `parseFurigana`/`stripFurigana` regex extended;
  `<Furigana>` takes lang="kk"/"ky" (cjkLang helpers); `cyrillic.ts`
  canonical Cyrillic→Latin fold wired into `answersMatchFor`; TTS tags +
  `cyrillicSpeakable`; grading prompt script rule for Latin typing.
- Blast LLM made configurable: `data/llm-config.json` (mode openai,
  DeepSeek baseUrl, gitignored), `LLM_BASE_URL`/`LLM_API_KEY` env fill-ins,
  429/402/quota-body → `LlmQuotaError` in http-provider, dashboard status
  pill shows `llm:` mode, claude pkill leftovers removed.

## Remaining (owner steps)

1. Put the DeepSeek API key in `data/llm-config.json` (or `LLM_API_KEY`
   env). Verify with `npm run llm:smoke`.
2. Create one profile per language in the browser app (tr native), let the
   curriculum generate, then `npm run db:push` so the script-side snapshot
   gains the new `grammar_topics` rows.
3. Blast: queue the new grammar blocks (grammar · az/uz/kk/ky/tk → tr ·
   A1..C2) and run. Dashboard shows `llm:openai@api.deepseek.com`; the
   quota wait mode now works for DeepSeek.
4. `npm run seed:grammar` to export the packaged seeds, commit + push
   (deploys automatically).
5. Spot-check kk/ky lessons for bracket-notation quality and grading with
   Latin-typed answers.

## Deliberately deferred (see T-097)

- kk/ky SelectionTooltip (transcription + lookup on text selection).
- Turkic-specific pages (e.g. an agglutinative conjugation/declension
  trainer); nav stays map/grammar/review/chat until one lands.
- en-native lane (titles and mt-grammar-titles stay empty/excluded).
