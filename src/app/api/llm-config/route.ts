import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  readLlmConfig,
  writeLlmConfig,
  resetLlmConfig,
  cliAllowed,
  type LlmConfig,
} from "@/lib/llm/config";
import { mergeLlmConfig } from "@/lib/llm/config-merge";

export const runtime = "nodejs";

const bodySchema = z.object({
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
  concurrency: z.number().int().positive().optional(),
});

function maskKey(key?: string): string | undefined {
  if (!key) return undefined;
  return key.length <= 4 ? "••••" : `••••${key.slice(-4)}`;
}

export function GET(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const config = readLlmConfig();
  return NextResponse.json({
    // Historical default when no file exists: cli.
    mode: config?.mode ?? "cli",
    baseUrl: config?.baseUrl,
    apiKeyMasked: maskKey(config?.apiKey),
    hasKey: Boolean(config?.apiKey),
    models: config?.models,
    jsonMode: config?.jsonMode,
    concurrency: config?.concurrency,
    cliAllowed: cliAllowed(),
  });
}

export async function PUT(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz yapılandırma", detail: parsed.error.message },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // Preserve the existing key when the client sends a masked placeholder or
  // omits it (the UI shows the masked key and doesn't resend the real one)
  // — but ONLY when saving onto the same (mode, baseUrl) endpoint. Otherwise
  // a key typed for one provider would silently ride along onto a different
  // target (e.g. a DeepSeek key sent as a Bearer token to a local bridge)
  // when the user switches providers with an empty key field. concurrency
  // is preserved the same way: neither settings UI sends it today, so an
  // omitted field must not reset it to undefined. See config-merge.ts.
  const existing = readLlmConfig();
  const merged = mergeLlmConfig(existing, input);

  const config: LlmConfig = {
    mode: merged.mode,
    baseUrl: merged.baseUrl,
    apiKey: merged.apiKey,
    models: merged.models,
    jsonMode: merged.jsonMode,
    concurrency: merged.concurrency,
  };
  writeLlmConfig(config);
  resetLlmConfig();
  return NextResponse.json({ ok: true });
}
