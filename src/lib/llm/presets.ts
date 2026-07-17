// Connection presets for the OpenAI-compatible HTTP provider. Each preset
// fills in a baseUrl and sensible default model IDs; the user can override any
// field. `jsonMode` = the endpoint supports response_format:{type:"json_object"}.
// Anthropic is NOT OpenAI-compatible and is handled by a separate provider
// (mode:"anthropic"), so it is not in this table.

export type PresetId =
  | "deepseek"
  | "openai"
  | "openrouter"
  | "ollama"
  | "lmstudio"
  | "bridge"
  | "custom";

export interface ProviderPreset {
  id: PresetId;
  label: string;
  /** OpenAI-compatible base URL (…/v1). Empty for custom. */
  baseUrl: string;
  /** Endpoint honours response_format json_object. */
  jsonMode: boolean;
  /** Default tier→model suggestions; user editable. */
  models: { fast: string; balanced: string; deep: string };
  /** Whether an API key is expected (local servers usually don't need one). */
  needsKey: boolean;
}

export const PRESETS: Record<PresetId, ProviderPreset> = {
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    jsonMode: true,
    models: { fast: "deepseek-chat", balanced: "deepseek-chat", deep: "deepseek-reasoner" },
    needsKey: true,
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    jsonMode: true,
    models: { fast: "gpt-4o-mini", balanced: "gpt-4o", deep: "gpt-4o" },
    needsKey: true,
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    jsonMode: true,
    models: {
      fast: "anthropic/claude-3.5-haiku",
      balanced: "anthropic/claude-sonnet-4",
      deep: "anthropic/claude-opus-4",
    },
    needsKey: true,
  },
  ollama: {
    id: "ollama",
    label: "Ollama (yerel)",
    baseUrl: "http://localhost:11434/v1",
    jsonMode: true,
    models: { fast: "llama3.2", balanced: "llama3.1", deep: "llama3.1:70b" },
    needsKey: false,
  },
  lmstudio: {
    id: "lmstudio",
    label: "LM Studio (yerel)",
    baseUrl: "http://localhost:1234/v1",
    jsonMode: false,
    models: { fast: "local-model", balanced: "local-model", deep: "local-model" },
    needsKey: false,
  },
  bridge: {
    // scripts/llm-bridge.mjs: yerel claude/codex/copilot/gemini/opencode
    // CLI'sını OpenAI-uyumlu endpoint'e çevirir (abonelik, API key'siz).
    id: "bridge",
    label: "Yerel köprü (llm-bridge: claude/codex/...)",
    baseUrl: "http://localhost:8484/v1",
    jsonMode: false,
    models: { fast: "haiku", balanced: "sonnet", deep: "opus" },
    needsKey: false,
  },
  custom: {
    id: "custom",
    label: "Özel (OpenAI uyumlu)",
    baseUrl: "",
    jsonMode: false,
    models: { fast: "", balanced: "", deep: "" },
    needsKey: false,
  },
};

export const PRESET_LIST = Object.values(PRESETS);
