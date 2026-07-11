import { NextResponse } from "next/server";
import { z } from "zod";
import { getProvider, LlmAuthError } from "@/lib/llm/provider";

export const runtime = "nodejs";

export async function POST() {
  const started = Date.now();
  try {
    const result = await getProvider().generateJson({
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
