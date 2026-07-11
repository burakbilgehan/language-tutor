import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, tables } from "@/db";
import { getProvider } from "@/lib/llm/provider";
import { GradeSchema } from "@/lib/llm/schemas";
import { gradingPrompt } from "@/lib/llm/prompts/lesson";
import { awardXp } from "@/lib/xp";
import { answersMatch, stripFurigana } from "@/lib/jp";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = z
    .object({ response: z.string().min(1) })
    .safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "response gerekli" }, { status: 400 });
  }
  const userResponse = parsed.data.response;

  const exercise = db.query.exercises
    .findFirst({ where: eq(tables.exercises.id, id) })
    .sync();
  if (!exercise) {
    return NextResponse.json({ error: "Alıştırma bulunamadı" }, { status: 404 });
  }
  const profile = db.query.profiles.findFirst().sync();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }

  // Romaji-tolerant: "konnichiwa" matches こんにちは (see lib/jp.ts).
  const accepted = [exercise.answer, ...(exercise.acceptAlso ?? [])].map(
    stripFurigana
  );
  const isExactMatch = accepted.some((a) => answersMatch(a, userResponse));

  let result: {
    isCorrect: boolean;
    score: number;
    feedbackTr: string;
    gradedBy: "deterministic" | "llm";
  };

  if (exercise.grading === "deterministic" || isExactMatch) {
    result = isExactMatch
      ? {
          isCorrect: true,
          score: 100,
          feedbackTr: "Doğru! 🌸",
          gradedBy: "deterministic",
        }
      : {
          isCorrect: false,
          score: 0,
          feedbackTr: `Doğru cevap: ${exercise.answer}`,
          gradedBy: "deterministic",
        };
  } else {
    const { system, prompt } = gradingPrompt({
      targetLanguage: profile.targetLanguage,
      exerciseType: exercise.type,
      promptTr: exercise.promptTr,
      targetText: exercise.targetText,
      expectedAnswer: exercise.answer,
      userResponse,
    });
    const grade = await getProvider().generateJson({
      system,
      prompt,
      schema: GradeSchema,
      fixtureKey: "grade",
      tier: exercise.type === "free_response" ? "balanced" : "fast",
      timeoutMs: 90_000,
    });
    result = {
      isCorrect: grade.correct,
      score: grade.score,
      feedbackTr: grade.feedback_tr,
      gradedBy: "llm",
    };
  }

  db.insert(tables.attempts)
    .values({
      id: nanoid(),
      exerciseId: exercise.id,
      response: userResponse,
      isCorrect: result.isCorrect,
      score: result.score,
      feedbackTr: result.feedbackTr,
      gradedBy: result.gradedBy,
    })
    .run();

  let xpAwarded = 0;
  if (result.isCorrect) {
    xpAwarded = 5;
    awardXp(profile.id, xpAwarded, "exercise", exercise.id);
  }

  return NextResponse.json({ ...result, xpAwarded });
}
