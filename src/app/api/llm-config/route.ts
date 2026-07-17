import { NextResponse } from "next/server";
import { z } from "zod";
import {
  readLlmConfig,
  writeLlmConfig,
  resetLlmConfig,
  cliAllowed,
  type LlmConfig,
} from "@/lib/llm/config";

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

export function GET() {
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
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Geçersiz yapılandırma", detail: parsed.error.message },
      { status: 400 }
    );
  }
  const input = parsed.data;

  // Preserve the existing key when the client sends a masked placeholder or
  // omits it (the UI shows the masked key and doesn't resend the real one).
  const existing = readLlmConfig();
  const keyLooksMasked = input.apiKey?.startsWith("••••");
  const apiKey =
    input.apiKey && !keyLooksMasked ? input.apiKey : existing?.apiKey;

  const config: LlmConfig = {
    mode: input.mode,
    baseUrl: input.baseUrl,
    apiKey,
    models: input.models,
    jsonMode: input.jsonMode,
    concurrency: input.concurrency,
  };
  writeLlmConfig(config);
  resetLlmConfig();
  return NextResponse.json({ ok: true });
}
