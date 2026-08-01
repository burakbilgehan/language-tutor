---
id: T-057
title: Single-source model catalog - Eco/Balanced/Best profiles + stale-id cleanup
status: done
priority: p2
effort: M
confidence: high
depends: []
created: 2026-07-27
---
Groundwork for the LLM connection UX redesign (T-060). Today's problems:

- Model ids are scattered across 3+ places: the `presets.ts` table, a
  hand-copied Anthropic trio in `LlmProviderSection.tsx:91` and
  `LlmSetupWizard.tsx:409`, and inline literals in the wizard's Ollama/bridge
  paths.
- Defaults are stale: the openai preset's `gpt-4o-mini/gpt-4o` (2024), the
  openrouter preset's `claude-3.5-haiku/claude-sonnet-4/claude-opus-4` (dead
  slugs), the ollama preset's `llama3.2/3.1`.
- Tier->model resolution has THREE parallel copies: `modelForTierConfigured`
  (config.ts), `modelForTier` (provider.ts, CLI aliases), and the browser's
  `modelFor` (browser-provider.ts). On an empty config, the literal string
  `"fast"` can go to the API as a model name (an actual bug).

## Scope
1. New `src/lib/llm/catalog.ts`, the SINGLE source. Per provider:
   - `profiles: { eco, balanced, best }`: each profile a concrete
     fast/balanced/deep trio + a human-readable name ("DeepSeek V3, fast
     tasks" and similar).
   - Rough pricing metadata ($/Mtok in/out); T-060's budget hint feeds off
     this. Local/bridge providers: price = 0/subscription.
   - Filled with current ids (2026-generation; manually verify OpenRouter
     slugs against the live /models).
2. `presets.ts`, the wizard, `LlmProviderSection`, `ANTHROPIC_DEFAULT_MODELS`
   all feed from the catalog; inline model literals are deleted.
3. Unify tier resolution: one env-agnostic helper (route the server's three
   paths and the browser to the same function; the CLI short-alias behavior
   is preserved). Remove the literal-tier fallback; a meaningful error
   instead if the model can't be resolved.
4. Config shape UNCHANGED (`models: {fast,balanced,deep}` stays, existing
   configs and saves aren't broken); the catalog is only an upper layer that
   FILLS this shape.

Fence: `src/lib/llm/*` + only import/constant lines in two settings
components. No `src/core`/DB, so no parity harness needed. Verification:
tsc, `npm test`, `LLM_PROVIDER=fixture` smoke, browser path in the static
build. Freshness automation is a SEPARATE ticket: T-058.
