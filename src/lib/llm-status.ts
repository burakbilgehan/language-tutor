"use client";

import { useEffect, useState } from "react";

// Client-side LLM availability. GET /api/health/llm is cheap (no LLM call);
// the result is cached module-level so many components can gate on it without
// refetching. `configured: true` is the optimistic default — gating only
// kicks in once the server confirms there is no LLM (avoids UI flicker for
// the common configured case).

export interface LlmStatus {
  configured: boolean;
  mode: "cli" | "openai" | "anthropic" | "none";
  cliAllowed: boolean;
}

const DEFAULT_STATUS: LlmStatus = {
  configured: true,
  mode: "cli",
  cliAllowed: true,
};

let cached: LlmStatus | null = null;
let inflight: Promise<LlmStatus> | null = null;

async function fetchStatus(): Promise<LlmStatus> {
  if (cached) return cached;
  // Statik mod: sunucu yok — tarayıcı LLM katmanı gelene kadar "LLM yok"
  // kabul et (UI üretim aksiyonlarını gizler, cache'li her şey çalışır).
  if (process.env.NEXT_PUBLIC_STATIC_BUILD === "1") {
    cached = { configured: false, mode: "none", cliAllowed: false };
    return cached;
  }
  if (!inflight) {
    inflight = fetch("/api/health/llm")
      .then(async (res) => {
        if (!res.ok) return DEFAULT_STATUS;
        cached = (await res.json()) as LlmStatus;
        return cached;
      })
      .catch(() => DEFAULT_STATUS)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
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
