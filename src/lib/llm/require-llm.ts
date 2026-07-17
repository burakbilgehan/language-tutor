import { NextResponse } from "next/server";
import { llmConfigured } from "./config";

/**
 * Route guard for user-triggered LLM work. Returns a 503 response when no LLM
 * is configured (mode "none", or cli on a CLI-disabled deployment) — the
 * client shows a friendly "LLM gerekli" state instead of an eternal spinner
 * or a 500. Returns null when an LLM path exists.
 */
export function requireLlm(): NextResponse | null {
  if (llmConfigured()) return null;
  return NextResponse.json(
    {
      error: "llm_unconfigured",
      message:
        "Bu işlem için bir LLM sağlayıcısı gerekli. Ayarlar → LLM Sağlayıcı bölümünden yapılandırabilirsin.",
    },
    { status: 503 }
  );
}
