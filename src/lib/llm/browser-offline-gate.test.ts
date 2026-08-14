// T-095: browserLlmConfigured'ın uçak modu kapısı. Ağ yokken (onLine=false)
// UZAK endpoint'ler "configured değil" sayılır (degrade: self-check grading,
// sessiz no-op generation); loopback (Ollama/köprü) muaf kalır çünkü aynı
// makinedeki endpoint uçak modunda da erişilebilir.
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_LLM_FIXTURE = "";

const store = new Map<string, string>();
Object.defineProperty(globalThis, "window", {
  value: globalThis,
  configurable: true,
});
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  } as Storage,
});

let online = true;
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  get: () => ({ onLine: online }),
});

// Stub'lar import'tan ÖNCE kurulur ama browser-provider bunlara import anında
// değil yalnız çağrı anında dokunur; static import güvenli.
import { browserLlmConfigured, writeBrowserLlmConfig } from "./browser-provider";

function setConfig(c: {
  mode: "openai" | "anthropic" | "none";
  baseUrl?: string;
  apiKey?: string;
}) {
  store.clear();
  if (c.mode !== "none") writeBrowserLlmConfig(c);
}

test("remote openai endpoint: configured online, degraded offline", () => {
  setConfig({ mode: "openai", baseUrl: "https://api.openai.com/v1" });
  online = true;
  assert.equal(browserLlmConfigured(), true);
  online = false;
  assert.equal(browserLlmConfigured(), false);
});

test("loopback openai endpoint (Ollama/bridge): stays configured offline", () => {
  for (const baseUrl of [
    "http://localhost:11434/v1",
    "http://127.0.0.1:8484/v1",
    "http://[::1]:11434/v1",
  ]) {
    setConfig({ mode: "openai", baseUrl });
    online = false;
    assert.equal(browserLlmConfigured(), true, baseUrl);
  }
});

test("anthropic (always remote): degraded offline", () => {
  setConfig({ mode: "anthropic", apiKey: "k" });
  online = true;
  assert.equal(browserLlmConfigured(), true);
  online = false;
  assert.equal(browserLlmConfigured(), false);
});

test("no config: unconfigured either way", () => {
  setConfig({ mode: "none" });
  online = true;
  assert.equal(browserLlmConfigured(), false);
  online = false;
  assert.equal(browserLlmConfigured(), false);
});
