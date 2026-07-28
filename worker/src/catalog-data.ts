/**
 * T-058: the Worker's own copy of the model catalog.
 *
 * Why a second copy instead of importing `src/lib/llm/catalog.ts`: the Worker
 * is a separate npm package with its own lockfile and no path into the app's
 * `src/` (same constraint that already forced `MAX_UPLOAD_BYTES` and
 * `VERSION_HEADER` to be spelled twice in routes.ts). A cross-package import
 * would also drag zero-node-import discipline and app-side tooling into a
 * Worker build that doesn't need it.
 *
 * This file is NOT the source of truth for what the app serves — that is
 * still `src/lib/llm/catalog.ts`. It exists only so the weekly cron
 * (`src/index.ts` `scheduled()`) has something to check ids against. Two
 * catalogs drift; `src/lib/llm/catalog.test.ts` (app side) asserts this file's
 * checkable id set matches the app catalog's, so a divergence fails the app
 * test suite rather than silently going stale.
 *
 * `checkAs`: only models with a live, key-free, publicly listable equivalent
 * are checkable. Populated deliberately, not derived by string-munging a
 * prefix on/off — a wrong heuristic mapping would produce a false "dead"
 * warning, and one false alarm is enough to make Burak stop trusting the
 * mechanism (worse than not having it). Entries with no realistic public
 * listing (CLI aliases, Ollama tags, DeepSeek's version-independent aliases,
 * "local-model", OpenAI native ids needing a key) get `checkAs: null` and are
 * never flagged stale — see catalog-check.ts.
 */

export interface CatalogCheckEntry {
  /** The id as it appears in the app catalog (CatalogModel.id). */
  id: string;
  /** OpenRouter model id to check this against, or null if not checkable. */
  checkAs: string | null;
}

/**
 * Flat list mirroring `MODEL_REGISTRY` keys in `src/lib/llm/catalog.ts`
 * (2026-07-28 snapshot). Update alongside the app catalog when models change.
 */
export const CATALOG_CHECK_ENTRIES: CatalogCheckEntry[] = [
  // Anthropic native ids — checked via their OpenRouter anthropic/* mirror.
  { id: "claude-haiku-4-5-20251001", checkAs: "anthropic/claude-haiku-4.5" },
  { id: "claude-sonnet-5", checkAs: "anthropic/claude-sonnet-5" },
  { id: "claude-opus-5", checkAs: "anthropic/claude-opus-5" },

  // CLI short aliases — not real model ids, nothing to check against.
  { id: "haiku", checkAs: null },
  { id: "sonnet", checkAs: null },
  { id: "opus", checkAs: null },

  // DeepSeek native aliases are deliberately version-independent (DeepSeek's
  // own docs: deepseek-chat/deepseek-reasoner always point at the current
  // model) — not checkable against a dated OpenRouter slug without producing
  // false positives every time DeepSeek ships a new generation under the
  // same alias.
  { id: "deepseek-chat", checkAs: null },
  { id: "deepseek-reasoner", checkAs: null },

  // OpenAI native ids — checked via their OpenRouter openai/* mirror (native
  // API needs a key, OpenRouter's public listing does not).
  { id: "gpt-5.4-nano", checkAs: "openai/gpt-5.4-nano" },
  { id: "gpt-5.4-mini", checkAs: "openai/gpt-5.4-mini" },
  { id: "gpt-5.4", checkAs: "openai/gpt-5.4" },

  // OpenRouter slugs — checked directly against themselves.
  { id: "anthropic/claude-haiku-4.5", checkAs: "anthropic/claude-haiku-4.5" },
  { id: "anthropic/claude-sonnet-5", checkAs: "anthropic/claude-sonnet-5" },
  { id: "anthropic/claude-opus-5", checkAs: "anthropic/claude-opus-5" },
  { id: "deepseek/deepseek-v3.2", checkAs: "deepseek/deepseek-v3.2" },
  { id: "deepseek/deepseek-r1-0528", checkAs: "deepseek/deepseek-r1-0528" },

  // Ollama tags — not on OpenRouter at all (separate registry, no public
  // OpenRouter-style /models list checked here; T-057 verified these against
  // registry.ollama.ai's manifest API directly, out of scope for this cron).
  { id: "qwen2.5:7b", checkAs: null },
  { id: "qwen2.5:14b", checkAs: null },
  { id: "qwen2.5:32b", checkAs: null },

  // LM Studio placeholder — not a real model id.
  { id: "local-model", checkAs: null },
];
