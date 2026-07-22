import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { getProvider } from "@/lib/llm/provider";
import { GradeSchema } from "@/lib/llm/schemas";
import { gradingPrompt } from "@/lib/llm/prompts/lesson";
import { llmConfigured } from "@/lib/llm/config";
import { attemptExercise } from "@/core/lesson";
import { makeLlmGrader } from "@/core/llm-gen";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = z
    .object({
      response: z.string().min(1),
      // LLM'siz self-check ikinci adımı: kullanıcının kendi verdiği hüküm.
      selfVerdict: z.boolean().optional(),
    })
    .safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "response gerekli" }, { status: 400 });
  }

  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "profile_missing" }, { status: 404 });
  }

  const outcome = await attemptExercise(db, {
    exerciseId: id,
    response: parsed.data.response,
    selfVerdict: parsed.data.selfVerdict,
    profile,
    // LLM yapılandırılmışsa gerçek değerlendirme; değilse callback yok →
    // core self-check protokolüne düşer.
    llmGrade: llmConfigured()
      ? makeLlmGrader(getProvider(), profile, parsed.data.response)
      : undefined,
  });

  if (outcome.kind === "notFound") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (outcome.kind === "needsSelfCheck") {
    return NextResponse.json({
      needsSelfCheck: true,
      expected: outcome.expected,
    });
  }
  return NextResponse.json(outcome.result);
}
