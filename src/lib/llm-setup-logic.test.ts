import test from "node:test";
import assert from "node:assert/strict";
import {
  BRIDGE_SENTINEL_TRIPLE,
  backendSupportsQuality,
  budgetHintFor,
  modelLineFor,
  modelsForQuality,
  ollamaPullCommand,
  qualityForModels,
} from "../components/settings/llm-setup-logic";
import { CATALOG, MODEL_REGISTRY } from "./llm/catalog";

// T-060. The test lives here rather than next to its module because the test
// script glob is rooted at src/lib/ (package.json, outside this ticket's
// fence). The module under test is deliberately React-free so `tsx --test`
// can import it.

// --------------------------------------------------------------- sentinel
// The single highest-risk regression this ticket could reintroduce: the new
// quality selector writes `models` from the catalog, and the bridge entry's
// triple is real Claude aliases (haiku/sonnet/opus). Sending those to a
// codex/copilot/gemini CLI is exactly the T-057 bug catalog.test.ts locks on
// the resolution side; this locks the UI side that produces the value.

test("modelsForQuality: non-claude bridge backends always get the sentinel triple, never a Claude alias", () => {
  for (const backend of ["codex", "copilot", "gemini", "opencode"] as const) {
    for (const q of ["eco", "balanced", "best"] as const) {
      const models = modelsForQuality("bridge", q, backend);
      assert.deepEqual(
        models,
        BRIDGE_SENTINEL_TRIPLE,
        `${backend}/${q} must stay the sentinel`
      );
      // Belt and braces: no catalog model id may leak through.
      for (const id of Object.values(models)) {
        assert.ok(
          !(id in MODEL_REGISTRY),
          `${backend}/${q} leaked a real model id: ${id}`
        );
      }
    }
  }
});

test("modelsForQuality: claude bridge backend does get real aliases", () => {
  assert.deepEqual(
    modelsForQuality("bridge", "balanced", "claude"),
    CATALOG.bridge.profiles.balanced.models
  );
  assert.equal(backendSupportsQuality("claude"), true);
  assert.equal(backendSupportsQuality("codex"), false);
});

test("modelsForQuality: eco/balanced/best map to the catalog profiles and differ", () => {
  const eco = modelsForQuality("openrouter", "eco");
  const best = modelsForQuality("openrouter", "best");
  assert.deepEqual(eco, CATALOG.openrouter.profiles.eco.models);
  assert.deepEqual(best, CATALOG.openrouter.profiles.best.models);
  assert.notDeepEqual(eco, best);
});

test("modelsForQuality returns a copy — mutating it cannot corrupt the catalog", () => {
  const models = modelsForQuality("deepseek", "balanced");
  models.fast = "tampered";
  assert.notEqual(CATALOG.deepseek.profiles.balanced.models.fast, "tampered");
});

// ------------------------------------------------------------- inference
// The stored config carries only the resolved triple (llmConfigPut has no
// profile field and client-api is fenced), so re-opening the wizard has to
// infer the profile back. An unmatched triple must read as "Özel" — NOT get
// rounded into some profile, which would silently rewrite hand-picked models
// on the next save.

test("qualityForModels: round-trips every provider/profile pair", () => {
  for (const provider of ["deepseek", "openai", "openrouter", "anthropic", "ollama"] as const) {
    for (const q of ["eco", "balanced", "best"] as const) {
      const models = modelsForQuality(provider, q);
      const inferred = qualityForModels(provider, models);
      // lmstudio-style providers whose three profiles are identical would
      // legitimately resolve to the first match; these five do not.
      assert.equal(inferred, q, `${provider}/${q} did not round-trip`);
    }
  }
});

test("qualityForModels: hand-picked models infer as null (rendered 'Özel'), not a forced profile", () => {
  assert.equal(
    qualityForModels("deepseek", {
      fast: "deepseek-chat",
      balanced: "some-custom-model",
      deep: "deepseek-reasoner",
    }),
    null
  );
  assert.equal(qualityForModels("deepseek", undefined), null);
  assert.equal(qualityForModels("custom", { fast: "x", balanced: "y", deep: "z" }), null);
});

test("qualityForModels: sentinel-carrying bridge backends have no profile", () => {
  assert.equal(
    qualityForModels("bridge", BRIDGE_SENTINEL_TRIPLE, "codex"),
    null
  );
});

// ------------------------------------------------ label/value agreement
// The wizard shows a profile LABEL and saves a model TRIPLE. If those two
// ever disagree, the screen lies about what it is about to write — which is
// the exact ambiguity this ticket exists to kill. Two bugs found in review
// lived here, so the resolution rule is mirrored and pinned:
//   quality = picked ?? (stored for THIS provider) ?? "balanced"
//   models  = (quality === null && stored is for this provider)
//               ? the stored triple verbatim
//               : modelsForQuality(provider, quality ?? "balanced", backend)

type Stored = {
  provider: Parameters<typeof modelsForQuality>[0];
  quality: ReturnType<typeof qualityForModels>;
  models: ReturnType<typeof modelsForQuality>;
} | null;

function resolveQuality(
  picked: ReturnType<typeof qualityForModels>,
  stored: Stored,
  active: Parameters<typeof modelsForQuality>[0]
) {
  return picked ?? (stored && stored.provider === active ? stored.quality : "balanced");
}
function resolveModels(
  quality: ReturnType<typeof qualityForModels>,
  stored: Stored,
  active: Parameters<typeof modelsForQuality>[0],
  backend?: Parameters<typeof modelsForQuality>[2]
) {
  return quality === null && stored?.provider === active
    ? stored.models
    : modelsForQuality(active, quality ?? "balanced", backend);
}

test("switching providers does not carry a foreign 'Özel' label onto a default triple", () => {
  const handPicked = { fast: "my-tiny", balanced: "my-mid", deep: "my-big" };
  const stored: Stored = { provider: "deepseek", quality: null, models: handPicked };

  // Same provider: the label says "Özel" and the hand-picked models are kept
  // verbatim — pressing save from the casual door must NOT overwrite them.
  assert.equal(resolveQuality(null, stored, "deepseek"), null);
  assert.deepEqual(resolveModels(null, stored, "deepseek"), handPicked);

  // Different provider: "Özel" was about deepseek, so openai falls back to
  // balanced — and the label must say balanced, not "Özel".
  assert.equal(resolveQuality(null, stored, "openai"), "balanced");
  assert.deepEqual(
    resolveModels(resolveQuality(null, stored, "openai"), stored, "openai"),
    modelsForQuality("openai", "balanced")
  );
});

test("label and saved triple agree in every door/stored-config combination", () => {
  const handPicked = { fast: "my-tiny", balanced: "my-mid", deep: "my-big" };
  const cases: [string, ReturnType<typeof qualityForModels>, Stored, Parameters<typeof modelsForQuality>[0], Parameters<typeof modelsForQuality>[2]][] = [
    ["fresh user", null, null, "deepseek", undefined],
    ["custom stored, same provider", null, { provider: "deepseek", quality: null, models: handPicked }, "deepseek", undefined],
    ["custom stored, other provider", null, { provider: "deepseek", quality: null, models: handPicked }, "openai", undefined],
    ["custom stored, then picks eco", "eco", { provider: "deepseek", quality: null, models: handPicked }, "deepseek", undefined],
    ["eco stored, same provider", null, { provider: "deepseek", quality: "eco", models: modelsForQuality("deepseek", "eco") }, "deepseek", undefined],
    ["bridge/codex ignores the pick", "best", null, "bridge", "codex"],
    ["bridge/claude honours it", "best", null, "bridge", "claude"],
  ];
  for (const [name, picked, stored, provider, backend] of cases) {
    const q = resolveQuality(picked, stored, provider);
    const models = resolveModels(q, stored, provider, backend);
    const denoted =
      q === null
        ? stored?.provider === provider
          ? stored.models
          : null
        : modelsForQuality(provider, q, backend);
    assert.deepEqual(models, denoted, `${name}: label "${q ?? "Özel"}" does not denote the saved triple`);
  }
});

// ---------------------------------------------------------------- budget
// describeModel() hands back price 0 for ids it has never heard of, so a
// naive estimate would print "~$0/month" for a custom endpoint — a lie about
// someone's money. Unknown must mean "no number shown".

test("budgetHintFor: unknown model ids yield no estimate rather than $0", () => {
  assert.deepEqual(
    budgetHintFor("openai", { fast: "mystery-model", balanced: "x", deep: "y" }),
    { kind: "unknown" }
  );
  assert.deepEqual(
    budgetHintFor("custom", CATALOG.openai.defaultModels),
    { kind: "unknown" }
  );
  assert.deepEqual(
    budgetHintFor("openai", { fast: "", balanced: "", deep: "" }),
    { kind: "unknown" }
  );
});

test("budgetHintFor: local/subscription providers are free, not $0.00", () => {
  assert.deepEqual(budgetHintFor("ollama", CATALOG.ollama.defaultModels), { kind: "free" });
  assert.deepEqual(budgetHintFor("cli", CATALOG.cli.defaultModels), { kind: "free" });
  assert.deepEqual(budgetHintFor("bridge", BRIDGE_SENTINEL_TRIPLE), { kind: "free" });
  assert.deepEqual(budgetHintFor("lmstudio", CATALOG.lmstudio.defaultModels), { kind: "free" });
});

test("budgetHintFor: paid providers give a positive estimate, and eco < best", () => {
  const eco = budgetHintFor("anthropic", modelsForQuality("anthropic", "eco"));
  const best = budgetHintFor("anthropic", modelsForQuality("anthropic", "best"));
  assert.equal(eco.kind, "estimate");
  assert.equal(best.kind, "estimate");
  if (eco.kind !== "estimate" || best.kind !== "estimate") return;
  assert.ok(eco.usdPerMonth > 0);
  assert.ok(
    best.usdPerMonth > eco.usdPerMonth,
    "the more expensive profile must estimate higher"
  );
  // DeepSeek should land in cents-per-month territory, Anthropic dollars —
  // if this inverts, the usage weights or the catalog prices are wrong.
  const ds = budgetHintFor("deepseek", modelsForQuality("deepseek", "balanced"));
  assert.equal(ds.kind, "estimate");
  if (ds.kind !== "estimate") return;
  assert.ok(ds.usdPerMonth < eco.usdPerMonth);
});

// ------------------------------------------------------------ model line
test("modelLineFor: names both ends, collapses when they match, stays silent on sentinel", () => {
  const line = modelLineFor(CATALOG.deepseek.defaultModels);
  assert.ok(line);
  assert.match(line.fastLabel, /DeepSeek/);
  assert.match(line.deepLabel, /Reasoner/);
  assert.equal(line.same, false);

  const collapsed = modelLineFor(CATALOG.lmstudio.defaultModels);
  assert.equal(collapsed?.same, true);

  assert.equal(modelLineFor(BRIDGE_SENTINEL_TRIPLE), null);
  assert.equal(modelLineFor({ fast: "", balanced: "", deep: "" }), null);
});

// ---------------------------------------------------------------- ollama
test("ollamaPullCommand: pulls the tags the SELECTED profile needs, deduped", () => {
  const best = modelsForQuality("ollama", "best");
  const cmd = ollamaPullCommand(best);
  for (const tag of new Set(Object.values(best))) {
    assert.ok(cmd.includes(`ollama pull ${tag}`), `missing pull for ${tag}`);
  }
  // best = 14b/32b/32b → two pulls, not three.
  assert.equal(cmd.split("&&").length, new Set(Object.values(best)).size);
  // The eco profile must not silently pull the balanced default set.
  assert.notEqual(ollamaPullCommand(modelsForQuality("ollama", "eco")), cmd);
});
