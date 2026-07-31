// Pure merge logic for a PUT/save of the LLM config (T-066). Node-free (no
// fs/path) so it's importable from both the server route and the static
// build's client-api.ts branch without pulling node deps into the browser
// bundle (same constraint documented in catalog.ts).
//
// Two rules the save path must apply identically everywhere it merges an
// incoming payload onto a stored config:
//
// 1. "Empty apiKey input = keep the stored key" is scoped to the SAME
//    endpoint, not applied blindly. Without this, switching the connection
//    target (e.g. DeepSeek → a local bridge) silently carries the old
//    provider's key onto the new baseUrl, which then gets sent as a Bearer
//    token to whatever is listening there (T-066 finding #1). Identity is
//    (mode, baseUrl normalized with a trailing slash stripped) — the same
//    normalization providerForBaseUrl() already documents. cli/none have no
//    endpoint to leak a key to, so a stored key is preserved across them
//    (lets "turn off, turn back on" round-trip without re-entering a key);
//    the key is dropped the moment the baseUrl (or mode, for anthropic vs
//    openai) actually changes.
// 2. concurrency is never sent by either settings UI today (T-066 finding
//    #2) — an omitted field means "keep the stored value", not "reset to
//    undefined".
//
// A masked placeholder ("••••...", what the UI echoes back for a stored key
// it never re-sends) is treated as absent input, same as empty/undefined.

export interface MergeableLlmConfig {
  mode: string;
  baseUrl?: string;
  apiKey?: string;
  concurrency?: number;
}

function normalizedEndpoint(config: MergeableLlmConfig | null | undefined): string {
  if (!config) return "";
  if (config.mode === "cli" || config.mode === "none") return config.mode;
  return `${config.mode}::${(config.baseUrl ?? "").replace(/\/$/, "")}`;
}

function looksMasked(key: string | undefined): boolean {
  return Boolean(key?.startsWith("••••"));
}

/** Merges an incoming save payload onto the previously-stored config. Pure —
 * caller does the actual read/write. */
export function mergeLlmConfig<T extends MergeableLlmConfig>(
  existing: T | null,
  input: T
): T {
  const sameEndpoint = normalizedEndpoint(existing) === normalizedEndpoint(input);
  const inputKeyUsable = input.apiKey && !looksMasked(input.apiKey);
  const apiKey = inputKeyUsable
    ? input.apiKey
    : sameEndpoint
      ? existing?.apiKey
      : undefined;

  return {
    ...input,
    apiKey,
    concurrency: input.concurrency ?? existing?.concurrency,
  };
}
