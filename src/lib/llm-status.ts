"use client";

import { useEffect, useState } from "react";

// Client-side LLM availability, read from the browser LLM config in
// localStorage. The result is cached module-level so many components can gate
// on it without re-reading. `configured: true` is the optimistic default —
// the real answer lands within a microtask (a dynamic import away), and
// defaulting pessimistic would flicker the gates for the common configured
// case.

export interface LlmStatus {
  configured: boolean;
  mode: "cli" | "openai" | "anthropic" | "none";
  cliAllowed: boolean;
}

const DEFAULT_STATUS: LlmStatus = {
  configured: true,
  mode: "none",
  cliAllowed: false,
};

let cached: LlmStatus | null = null;

async function fetchStatus(): Promise<LlmStatus> {
  if (cached) return cached;
  const { readBrowserLlmConfig, browserLlmConfigured } = await import(
    "@/lib/llm/browser-provider"
  );
  const c = readBrowserLlmConfig();
  cached = {
    configured: browserLlmConfigured(),
    mode: (c?.mode ?? "none") as LlmStatus["mode"],
    cliAllowed: false,
  };
  return cached;
}

/** Drop the cache (after saving new LLM settings) so gates re-evaluate. */
export function invalidateLlmStatus() {
  cached = null;
}

export function useLlmStatus(): LlmStatus {
  const [status, setStatus] = useState<LlmStatus>(cached ?? DEFAULT_STATUS);
  useEffect(() => {
    let alive = true;
    fetchStatus().then((s) => {
      if (alive) setStatus(s);
    });
    return () => {
      alive = false;
    };
  }, []);
  return status;
}
