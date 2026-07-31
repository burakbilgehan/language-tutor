import test from "node:test";
import assert from "node:assert/strict";
import { mergeLlmConfig, type MergeableLlmConfig } from "./config-merge";

// T-066 finding #1: "empty apiKey input = keep the stored key" used to apply
// regardless of which endpoint the save targets. Repro: a DeepSeek key saved,
// then the user switches the wizard's door to a local bridge and saves with
// an empty key field — the DeepSeek key must NOT ride along and get sent as
// a Bearer token to whatever is listening on localhost:8484.

test("mergeLlmConfig: switching baseUrl with an empty apiKey input drops the old key", () => {
  const existing: MergeableLlmConfig = {
    mode: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "sk-deepseek-secret",
  };
  const input: MergeableLlmConfig = {
    mode: "openai",
    baseUrl: "http://localhost:8484/v1",
    apiKey: undefined,
  };
  const merged = mergeLlmConfig(existing, input);
  assert.equal(merged.apiKey, undefined);
});

test("mergeLlmConfig: same baseUrl, empty apiKey input keeps the stored key", () => {
  const existing: MergeableLlmConfig = {
    mode: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "sk-deepseek-secret",
  };
  const input: MergeableLlmConfig = {
    mode: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: undefined,
  };
  const merged = mergeLlmConfig(existing, input);
  assert.equal(merged.apiKey, "sk-deepseek-secret");
});

test("mergeLlmConfig: switching provider (DeepSeek -> OpenAI, both needsKey) drops the old key even with empty input", () => {
  const existing: MergeableLlmConfig = {
    mode: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "sk-deepseek-secret",
  };
  const input: MergeableLlmConfig = {
    mode: "openai",
    baseUrl: "https://api.openai.com/v1",
    apiKey: undefined,
  };
  const merged = mergeLlmConfig(existing, input);
  assert.equal(merged.apiKey, undefined);
});

test("mergeLlmConfig: trailing-slash difference is normalized (same endpoint, key kept)", () => {
  const existing: MergeableLlmConfig = {
    mode: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "sk-deepseek-secret",
  };
  const input: MergeableLlmConfig = {
    mode: "openai",
    baseUrl: "https://api.deepseek.com/v1/",
    apiKey: undefined,
  };
  const merged = mergeLlmConfig(existing, input);
  assert.equal(merged.apiKey, "sk-deepseek-secret");
});

test("mergeLlmConfig: a masked placeholder (••••1234) input is treated as empty, not as the new key", () => {
  const existing: MergeableLlmConfig = {
    mode: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "sk-deepseek-secret",
  };
  const input: MergeableLlmConfig = {
    mode: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "••••cret",
  };
  const merged = mergeLlmConfig(existing, input);
  assert.equal(merged.apiKey, "sk-deepseek-secret");
});

test("mergeLlmConfig: a real (non-masked) apiKey input always wins, even on the same endpoint", () => {
  const existing: MergeableLlmConfig = {
    mode: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "sk-old",
  };
  const input: MergeableLlmConfig = {
    mode: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "sk-new",
  };
  const merged = mergeLlmConfig(existing, input);
  assert.equal(merged.apiKey, "sk-new");
});

test("mergeLlmConfig: switching to none drops the stored key (turning back on requires re-entering it)", () => {
  const existing: MergeableLlmConfig = {
    mode: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    apiKey: "sk-ant-secret",
  };
  // User flips to "none" (turns LLM off): the key is dropped, not parked —
  // a config with no live endpoint shouldn't keep a secret around.
  const toNone = mergeLlmConfig(existing, { mode: "none", apiKey: undefined });
  assert.equal(toNone.apiKey, undefined);
  // Flipping back on therefore starts keyless.
  const backOn = mergeLlmConfig(toNone, {
    mode: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    apiKey: undefined,
  });
  assert.equal(backOn.apiKey, undefined);
});

test("mergeLlmConfig: switching mode (anthropic -> openai) with empty input drops the key", () => {
  const existing: MergeableLlmConfig = {
    mode: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    apiKey: "sk-ant-secret",
  };
  const input: MergeableLlmConfig = {
    mode: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: undefined,
  };
  const merged = mergeLlmConfig(existing, input);
  assert.equal(merged.apiKey, undefined);
});

test("mergeLlmConfig: no existing config (first save) with empty apiKey stays empty", () => {
  const input: MergeableLlmConfig = {
    mode: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: undefined,
  };
  const merged = mergeLlmConfig(null, input);
  assert.equal(merged.apiKey, undefined);
});

// T-066 finding #2: concurrency must be preserved when the save payload
// omits it (neither settings UI sends it today).

test("mergeLlmConfig: omitted concurrency in the payload preserves the stored value", () => {
  const existing: MergeableLlmConfig = {
    mode: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    concurrency: 4,
  };
  const input: MergeableLlmConfig = {
    mode: "openai",
    baseUrl: "https://api.deepseek.com/v1",
  };
  const merged = mergeLlmConfig(existing, input);
  assert.equal(merged.concurrency, 4);
});

test("mergeLlmConfig: an explicit concurrency in the payload overrides the stored value", () => {
  const existing: MergeableLlmConfig = {
    mode: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    concurrency: 4,
  };
  const input: MergeableLlmConfig = {
    mode: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    concurrency: 2,
  };
  const merged = mergeLlmConfig(existing, input);
  assert.equal(merged.concurrency, 2);
});
