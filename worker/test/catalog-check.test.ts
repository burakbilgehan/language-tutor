import { describe, expect, it } from "vitest";
import { checkCatalog, extractOpenRouterIds } from "../src/catalog-check";
import { CATALOG_CHECK_ENTRIES } from "../src/catalog-data";

/**
 * T-058 pure logic tests — no fetch, no KV, no Worker runtime. Fixture-based
 * so these are fast and deterministic; the live-network proof (that a real
 * dead id gets flagged against the REAL OpenRouter response) is run manually,
 * see README "T-058 verification" — vitest should never depend on live
 * network for pass/fail.
 */

describe("checkCatalog", () => {
  it("flags a checkable id that is absent from the OpenRouter listing", () => {
    const warnings = checkCatalog(
      [{ id: "anthropic/claude-fake-9000", checkAs: "anthropic/claude-fake-9000" }],
      new Set(["anthropic/claude-sonnet-5"])
    );
    expect(warnings).toEqual([
      {
        id: "anthropic/claude-fake-9000",
        checkedAs: "anthropic/claude-fake-9000",
        reason: "not_found_on_openrouter",
      },
    ]);
  });

  it("does not flag an id present in the OpenRouter listing", () => {
    const warnings = checkCatalog(
      [{ id: "anthropic/claude-sonnet-5", checkAs: "anthropic/claude-sonnet-5" }],
      new Set(["anthropic/claude-sonnet-5"])
    );
    expect(warnings).toEqual([]);
  });

  it("never flags a non-checkable entry (checkAs: null), however empty the listing", () => {
    const warnings = checkCatalog(
      [
        { id: "haiku", checkAs: null },
        { id: "qwen2.5:7b", checkAs: null },
        { id: "local-model", checkAs: null },
      ],
      new Set()
    );
    expect(warnings).toEqual([]);
  });

  it("checks every entry independently — one dead id does not suppress or duplicate others", () => {
    const warnings = checkCatalog(
      [
        { id: "alive-1", checkAs: "alive-1" },
        { id: "dead-1", checkAs: "dead-1" },
        { id: "alive-2", checkAs: "alive-2" },
        { id: "dead-2", checkAs: "dead-2" },
      ],
      new Set(["alive-1", "alive-2"])
    );
    expect(warnings.map((w) => w.id)).toEqual(["dead-1", "dead-2"]);
  });

  it("the real CATALOG_CHECK_ENTRIES table has a checkAs for every OpenRouter-eligible provider family", () => {
    // Regression guard: someone adding a new anthropic/openai/openrouter id
    // to the app catalog without a checkAs entry here would silently make
    // that id unwatched forever. This doesn't catch that (cross-package), but
    // it does pin that today's known-checkable families stay checkable.
    const checkable = CATALOG_CHECK_ENTRIES.filter((e) => e.checkAs !== null).map((e) => e.id);
    expect(checkable).toEqual(
      expect.arrayContaining([
        "claude-haiku-4-5-20251001",
        "claude-sonnet-5",
        "claude-opus-5",
        "gpt-5.4-nano",
        "gpt-5.4-mini",
        "gpt-5.4",
        "anthropic/claude-haiku-4.5",
        "anthropic/claude-sonnet-5",
        "anthropic/claude-opus-5",
        "deepseek/deepseek-v3.2",
        "deepseek/deepseek-r1-0528",
      ])
    );
  });

  it("explicitly non-checkable families (CLI aliases, Ollama tags, local-model, DeepSeek native aliases) are never silently upgraded to checkable by accident", () => {
    const nonCheckable = new Set(
      CATALOG_CHECK_ENTRIES.filter((e) => e.checkAs === null).map((e) => e.id)
    );
    for (const id of [
      "haiku",
      "sonnet",
      "opus",
      "deepseek-chat",
      "deepseek-reasoner",
      "qwen2.5:7b",
      "qwen2.5:14b",
      "qwen2.5:32b",
      "local-model",
    ]) {
      expect(nonCheckable.has(id), id).toBe(true);
    }
  });
});

describe("extractOpenRouterIds", () => {
  it("pulls the id set out of the {data:[{id}...]} shape", () => {
    const ids = extractOpenRouterIds({
      data: [{ id: "a" }, { id: "b" }, { id: "a" }],
    });
    expect(ids).toEqual(new Set(["a", "b"]));
  });

  it("empty data yields an empty set, not an error", () => {
    expect(extractOpenRouterIds({ data: [] })).toEqual(new Set());
  });
});

describe("fixture: a known-dead id against a realistic OpenRouter-shaped snapshot", () => {
  // Small realistic snapshot (subset of a real /v1/models response, captured
  // 2026-07-28) plus one id that was NEVER real, standing in for "OpenRouter
  // renamed/retired this model". Proves the end-to-end wiring (extract +
  // check) produces exactly one warning, not zero and not a crash.
  const snapshot = {
    data: [
      { id: "anthropic/claude-opus-5" },
      { id: "anthropic/claude-sonnet-5" },
      { id: "anthropic/claude-haiku-4.5" },
      { id: "deepseek/deepseek-v3.2" },
      { id: "deepseek/deepseek-r1-0528" },
      { id: "openai/gpt-5.4-nano" },
      { id: "openai/gpt-5.4-mini" },
      { id: "openai/gpt-5.4" },
    ],
  };

  it("flags only the deliberately-fake id, nothing else", () => {
    const ids = extractOpenRouterIds(snapshot);
    const entries = [
      ...CATALOG_CHECK_ENTRIES,
      { id: "anthropic/claude-fake-9000", checkAs: "anthropic/claude-fake-9000" },
    ];
    const warnings = checkCatalog(entries, ids);
    expect(warnings).toEqual([
      {
        id: "anthropic/claude-fake-9000",
        checkedAs: "anthropic/claude-fake-9000",
        reason: "not_found_on_openrouter",
      },
    ]);
  });
});
