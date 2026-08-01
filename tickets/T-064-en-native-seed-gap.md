---
id: T-064
title: Content fallback chain: LLM override -> seed -> machine translation (MT) -> honest gap
status: done
priority: p1
effort: L
confidence: medium
depends: []
created: 2026-07-27
closed: 2026-07-27
---
**Closeout (2026-07-27, grammar phase):** the 4-layer chain was merged (`c321b36` + review fix `4b3ebcf`). MT engine: Argos was tried and rejected with evidence (silently dropping subordinate clauses in long sentences) - the ticket's own bail-out condition triggered early, so the pipeline fell back to our own LLM provider (fast tier, Max sub); both engines sit behind the `scripts/mt/engine.ts` `TranslateEngine` interface. What actually shipped: `public/grammar-seed/ja.en.json` (7 topics) + `src/lib/grammar-index/titles.{ja,zh,nl}.en.json` (ja run for real on all 20/20). Remaining:
- **Waiting on a Burak decision:** the badge text "auto-translated" - since the engine is an LLM, it could shift to (or drop) "translated by LLM"; decide after a 10-topic spot check. The full seed run (`npx tsx scripts/mt-grammar-seed.ts --all`) waits for spot-check approval.
- **Second phase (separate work):** kanji/vocab MT - the indexes already carry English glosses, likely only content MT is needed.
- **Deliberately left alone:** `seed-strip.ts` doesn't strip the MT (en) halves (wasted bytes, not data loss); no browser/manual UI testing was done.
- **Known quality gap (Burak saw it, said "leave it", 2026-07-27):** table fields (`column_headers`, `tables[].rows`) are excluded from MT wholesale to preserve CJK - so Turkish prose mixed into those fields ("Satır", "boş ünsüz") stays untranslated in the en seed. Fix if wanted: apply the protect.ts tripwire inside the cell and translate only the Latin portion (S effort).
This is the resolution of the en-native gap identified in T-056, expanded by Burak's 2026-07-27 ruling into a layered fallback chain. **Binding principles (Burak):**
- Translated content is shown ONLY when real content doesn't exist; it must never be treated as equivalent to real content.
- MT content always ships with a persistent badge plus message: "auto-translated - our content is being updated and refined every day, and you can generate your own precisely-tailored content with your own LLM at any time" (CTA -> LlmSetupWizard).
- Once the user generates with their own LLM, the MT silently gets replaced and the badge disappears.

## Chain (in priority order)
1. **LLM-generated** - in the profile's language, via the user's own LLM (current flow).
2. **Packaged seed** - real content (today, tr only; `apply*Seed`).
3. **Build-time MT** *(new)* - translated once on our side from the tr seed, packaged as `public/grammar-seed/en.json`. Tool candidates: Argos Translate (offline/local) or Workers AI m2m100. NO runtime browser MT (Chrome Translator API etc. - Chrome-only, per-user model download, wasteful for static content).
4. **Honest gap** - per-topic copy: "not ready yet, being updated every day, connect an LLM" (the hub-level status descending to topic level).

## Rules / technical
- Each layer fills ONLY an empty slot (the applyGrammarSeed pattern); LLM generation always overwrites MT.
- The source marker (`source: "llm" | "seed" | "mt"`) travels INSIDE the JSON - no new column -> no SAVE_SCHEMA_VERSION bump. Check that the zod schemas don't strip the extra field.
- **Field-level translation:** only descriptive prose goes into MT; target-language sentences and bracket notation (`漢字[かんじ]`, pinyin) are NEVER translated.
- **Titles:** grammar index titles are tr-only - translated once and committed to the index as the en title (the biggest part of the perceived en experience; check the equivalent in kanji/vocab indexes).
- Scope order: grammar first; kanji/vocab same pattern, second phase.

## Acceptance test + bail-out condition
10-topic MT spot check (Burak reviews). If quality falls short, the same pipeline switches to LLM-batch translation (blast panel, Max subscription, an overnight run); in that case the badge text drops to "translated by LLM" or disappears entirely (decided that day).

## Fence
Seed export scripts + `apply*Seed` gates (the `nativeLanguage !== "tr"` no-op evolves into "apply if a slot exists in that language") + `lang-content.ts` + badge UI + index title data. NO `schema.ts` column.
