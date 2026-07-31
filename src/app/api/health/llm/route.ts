import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getProvider, LlmAuthError, type LlmProvider } from "@/lib/llm/provider";
import { llmConfigured, effectiveMode, cliAllowed, type LlmConfig } from "@/lib/llm/config";

export const runtime = "nodejs";

/** Cheap availability probe — no LLM call. Drives client UI gating. */
export function GET() {
  return NextResponse.json({
    configured: llmConfigured(),
    mode: effectiveMode(),
    cliAllowed: cliAllowed(),
  });
}

// T-066: an optional candidate config in the POST body. Presence means "test
// this UNSAVED config", not the one on disk — the settings UIs now test
// before they save (see LlmSetupWizard's testAndSave), so a passing test
// actually predicts the config the user is about to persist. Shape mirrors
// llm-config/route.ts's bodySchema minus the fields the probe doesn't need.
const candidateSchema = z.object({
  mode: z.enum(["cli", "openai", "anthropic", "none"]),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  models: z
    .object({
      fast: z.string().optional(),
      balanced: z.string().optional(),
      deep: z.string().optional(),
    })
    .optional(),
  jsonMode: z.boolean().optional(),
});

export async function POST(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;

  // A body is optional (LlmAdvancedPanel's "Test connection" button tests
  // the SAVED config, unchanged) — only parse one when present.
  let candidate: LlmConfig | undefined;
  try {
    const raw = await req.json();
    const parsed = candidateSchema.safeParse(raw);
    if (parsed.success) candidate = parsed.data;
  } catch {
    // No body / not JSON — fall through to testing the stored config.
  }

  const started = Date.now();
  try {
    const provider = candidate ? providerForCandidate(candidate) : getProvider();
    const result = await provider.generateJson({
      system: "Kısa cevap ver.",
      prompt: 'JSON döndür: {"ok": true}',
      schema: z.object({ ok: z.boolean() }),
      fixtureKey: "smoke",
      tier: "fast",
      timeoutMs: 60_000,
    });
    return NextResponse.json({
      ok: result.ok === true,
      ms: Date.now() - started,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        auth: err instanceof LlmAuthError,
      },
      { status: 502 }
    );
  }
}

/** Builds a one-off provider for the candidate config — deliberately NOT
 * getProvider(), which caches a module-level singleton keyed off the SAVED
 * config's revision; routing a candidate through it would either poison
 * that cache with a config that was never saved, or (if the revision check
 * skips it) test the stale saved provider instead of the candidate. The
 * fixture short-circuit is preserved so `LLM_PROVIDER=fixture npm run dev`
 * stays token-free even from this probe path. */
function providerForCandidate(candidate: LlmConfig): LlmProvider {
  if (process.env.LLM_PROVIDER === "fixture") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { FixtureProvider } = require("@/lib/llm/fixture-provider") as typeof import("@/lib/llm/fixture-provider");
    return new FixtureProvider();
  }
  if (candidate.mode === "openai") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { HttpProvider } = require("@/lib/llm/http-provider") as typeof import("@/lib/llm/http-provider");
    return new HttpProvider(candidate);
  }
  if (candidate.mode === "anthropic") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AnthropicHttpProvider } = require("@/lib/llm/anthropic-http-provider") as typeof import("@/lib/llm/anthropic-http-provider");
    return new AnthropicHttpProvider(candidate);
  }
  // cli/none: no unsaved-candidate concept worth probing separately (cli
  // has no per-config secret to leak, "none" always throws) — fall back to
  // the real singleton so the response stays meaningful.
  return getProvider();
}
