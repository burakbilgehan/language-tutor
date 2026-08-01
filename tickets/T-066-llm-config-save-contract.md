---
id: T-066
title: LLM config save-path contract: key leakage + concurrency reset + test-before-save
status: done
priority: p2
effort: S
confidence: high
depends: []
created: 2026-07-28
closed: 2026-07-31
---
Three findings from the T-060 blind review (2026-07-28 night wave) that fell outside its fence - all belong to the `PUT /api/llm-config` contract and its static counterpart (client-api/core) - which T-060/T-061/T-063 deliberately left untouched.

## 1. Old apiKey carries over to localhost on a cloud->local switch (most important)
The save path applies the "empty apiKey input = keep the stored key" rule independently of baseUrl. Repro: a DeepSeek config with a key -> save from the local door with the bridge -> `{baseUrl:"http://localhost:8484/v1", apiKey:"sk-deepseek-..."}`. `http-provider.ts` sends it as a `Bearer` header on every request - the DeepSeek key leaks to whatever process is listening on localhost:8484. Fix direction: clear the key if the target provider has `needsKey === false`, or scope key retention to a same-baseUrl save. Pre-existing, but T-060's IA made switching between doors routine.

## 2. Every save resets `concurrency`
PUT is replace-all; neither the wizard nor LlmAdvancedPanel sends `concurrency` (the panel reads it on hydrate but never binds it to a field). A manually set value reverts to undefined on every save -> the queue falls back through LLM_CONCURRENCY to 1.

## 3. `testAndSave` saves first, then tests (pre-existing)
A failed test leaves a broken config on disk and `llmConfigured()` still returns true; since the button says "test and save" this is misleading. The order should flip (test -> save only if it succeeds) - since that's a behavior change, it's a deliberate separate ticket (not squeezed into the T-060 merge fix).

Fence note: the route + `client-api.ts` + the static core path must change together; if T-062 (OpenRouter PKCE) touches the key-writing spot, merge that first.

## Resolution (2026-07-31)
1. Key leakage: instead of `needsKey===false`, the chosen rule is "keep the key only if you're saving to the same (mode, normalized baseUrl) target" - the `needsKey` branch doesn't close the leak between two `needsKey:true` providers like DeepSeek->OpenAI, and it would wipe a `custom` (needsKey:false) user's key on every save. Pure helper: `src/lib/llm/config-merge.ts` (`mergeLlmConfig`), used by both the route and the static `client-api.ts`. cli/none have no endpoint - the key survives a round trip through them (turn off/on).
2. concurrency: same helper, `input.concurrency ?? existing?.concurrency`.
3. testAndSave order reversed: `llmTest(candidate)` now probes the unsaved config directly (an optional config override on HttpProvider/AnthropicHttpProvider; `/api/health/llm` POST accepts an optional candidate body, never mutates the `getProvider()` singleton). Static mirror: `probeBrowserConfig()`. Only saves once the test passes.

Verification: `npx tsc --noEmit` clean, `npm test` (187/188 passing including 12 new config-merge tests; the only failure is `db-reset.test.ts`, already broken on the worktree baseline before this work). `npm run build` and `npm run build:static` both pass.
