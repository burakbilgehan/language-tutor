import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { getProvider } from "@/lib/llm/provider";
import { requireLlm } from "@/lib/llm/require-llm";
import {
  previewCurriculumPrompt,
  saveCurriculumPedagogy,
} from "@/core/curriculum-gen";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

// T-080. Thin shells over src/core/curriculum-gen; static mode calls the same
// core functions directly through the client-api seam.

function fail(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json(
      { error: err.code, params: err.params },
      { status: err.code === "profile_missing" ? 404 : 400 }
    );
  }
  throw err;
}

/**
 * Build the exact prompt curriculum generation would send, split into the
 * locked contract halves and the editable pedagogy body.
 *
 * POST rather than GET on purpose: on a profile with no stored body this runs
 * the deep-tier meta-call and PERSISTS the result, so it is not a safe method.
 * That call can take a minute; the client owns the loading state, exactly like
 * the inline await in /api/curriculum/retranslate.
 */
export async function POST(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const gate = requireLlm();
  if (gate) return gate;
  const parsed = z
    .object({ profileId: z.string(), force: z.boolean().optional() })
    .safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "profileId gerekli" }, { status: 400 });
  }
  try {
    const preview = await previewCurriculumPrompt(
      db,
      getProvider(),
      parsed.data.profileId,
      { force: parsed.data.force }
    );
    return NextResponse.json(preview);
  } catch (err) {
    return fail(err);
  }
}

/**
 * Persist a hand-edited pedagogy body. No LLM call, so no requireLlm gate: an
 * edit must be storable even if the provider is momentarily unreachable.
 */
export async function PUT(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const parsed = z
    .object({ profileId: z.string(), pedagogy: z.string() })
    .safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "profileId ve pedagogy gerekli" },
      { status: 400 }
    );
  }
  try {
    saveCurriculumPedagogy(db, parsed.data.profileId, parsed.data.pedagogy);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
