import test from "node:test";
import assert from "node:assert/strict";
import { resolveModelId, CATALOG, providerForBaseUrl } from "./catalog";
import { LlmError } from "./provider-types";

// T-057: tier resolution used to fall back to the literal tier string
// ("fast"/"balanced"/"deep") when no config/env model was set, and that
// string could reach a real API as a model id. These tests pin the fixed
// behaviour: unresolved => throw, never the literal tier back out.

test("resolveModelId: custom provider with no config/env throws LlmError, never returns the literal tier", () => {
  assert.throws(
    () => resolveModelId({ tier: "fast", provider: "custom" }),
    (err: unknown) => err instanceof LlmError && /Model çözülemedi/.test(err.message)
  );
  assert.throws(() => resolveModelId({ tier: "balanced", provider: "custom" }));
  assert.throws(() => resolveModelId({ tier: "deep", provider: "custom" }));
});

test("resolveModelId: unresolved throw is never the bare tier name", () => {
  try {
    resolveModelId({ tier: "fast", provider: "custom" });
    assert.fail("expected a throw");
  } catch (err) {
    // The historical bug returned the string "fast" as if it were a model id.
    assert.notEqual((err as Error).message, "fast");
  }
});

test("resolveModelId: config.models[tier] wins over env and catalog default", () => {
  const id = resolveModelId({
    tier: "deep",
    provider: "deepseek",
    configModels: { deep: "custom-override" },
    envModels: { deep: "env-should-lose" },
  });
  assert.equal(id, "custom-override");
});

test("resolveModelId: env wins over the catalog default when config is absent", () => {
  const id = resolveModelId({
    tier: "fast",
    provider: "deepseek",
    envModels: { fast: "env-model" },
  });
  assert.equal(id, "env-model");
});

test("resolveModelId: falls back to the catalog default for the matched provider", () => {
  const id = resolveModelId({ tier: "fast", provider: "deepseek" });
  assert.equal(id, CATALOG.deepseek.defaultModels.fast);
});

test("resolveModelId: cli provider keeps the short-alias defaults (haiku/sonnet/opus)", () => {
  assert.equal(resolveModelId({ tier: "fast", provider: "cli" }), "haiku");
  assert.equal(resolveModelId({ tier: "balanced", provider: "cli" }), "sonnet");
  assert.equal(resolveModelId({ tier: "deep", provider: "cli" }), "opus");
});

test("resolveModelId: cli provider still honours an env override (LLM_MODEL_* semantics)", () => {
  const id = resolveModelId({
    tier: "deep",
    provider: "cli",
    envModels: { deep: "sonnet" }, // e.g. LLM_MODEL_DEEP=sonnet
  });
  assert.equal(id, "sonnet");
});

test("resolveModelId: anthropic provider resolves to real dated/native ids, not aliases", () => {
  const id = resolveModelId({ tier: "balanced", provider: "anthropic" });
  assert.equal(id, CATALOG.anthropic.defaultModels.balanced);
  assert.ok(id.startsWith("claude-"));
});

test("providerForBaseUrl: matches every non-empty catalog baseUrl back to its provider id", () => {
  for (const entry of Object.values(CATALOG)) {
    if (!entry.baseUrl) continue;
    assert.equal(providerForBaseUrl(entry.baseUrl), entry.id);
  }
});

test("providerForBaseUrl: unknown baseUrl resolves to undefined (caller falls back to custom)", () => {
  assert.equal(providerForBaseUrl("https://example.com/v1"), undefined);
  assert.equal(providerForBaseUrl(undefined), undefined);
});

test("resolveModelId: bridge sentinel — an explicit tier-name config value (codex/copilot/gemini) round-trips unchanged, never falls through to the bridge's claude alias", () => {
  // scripts/llm-bridge.mjs reads the literal tier name back out of the model
  // field as "no model selected, let the backend use its own default" — the
  // one place a tier string as a "model id" is intentional. LlmSetupWizard's
  // SUB_BACKENDS.codex/copilot/gemini store exactly this ({fast:"fast",...})
  // instead of an empty string, on purpose.
  assert.equal(
    resolveModelId({ tier: "fast", provider: "bridge", configModels: { fast: "fast" } }),
    "fast"
  );
  assert.equal(
    resolveModelId({
      tier: "balanced",
      provider: "bridge",
      configModels: { balanced: "balanced" },
    }),
    "balanced"
  );
});

test("resolveModelId: bridge with an EMPTY string config falls through to the claude alias default (the regression this catalog must not reintroduce for codex/copilot/gemini)", () => {
  // Documents the failure mode: an empty string is falsy, so it does NOT win
  // over the catalog default the way the tier-name sentinel above does. If a
  // caller ever stores {fast: "", ...} for a non-claude bridge backend again,
  // this is what breaks — the bridge would receive "haiku" instead of the
  // undefined it needs to fall back to the backend's own default.
  assert.equal(
    resolveModelId({ tier: "fast", provider: "bridge", configModels: { fast: "" } }),
    CATALOG.bridge.defaultModels.fast
  );
});

test("catalog: every provider's three quality profiles are non-empty triples (except custom, which is user-filled)", () => {
  for (const entry of Object.values(CATALOG)) {
    if (entry.id === "custom") continue;
    for (const profile of Object.values(entry.profiles)) {
      assert.ok(profile.models.fast, `${entry.id}/${profile.id}.fast`);
      assert.ok(profile.models.balanced, `${entry.id}/${profile.id}.balanced`);
      assert.ok(profile.models.deep, `${entry.id}/${profile.id}.deep`);
    }
  }
});
