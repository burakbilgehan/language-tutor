import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { getProvider } from "@/lib/llm/provider";
import { GradeSchema } from "@/lib/llm/schemas";
import { gradingPrompt } from "@/lib/llm/prompts/lesson";
import { awardXp } from "@/lib/xp";
import { stripFurigana } from "@/lib/jp";
import { answersMatchFor } from "@/lib/answers";
import { pick } from "@/lib/i18n";
import { llmConfigured } from "@/lib/llm/config";

export const runtime = "nodejs";

// User-visible deterministic grading feedback (LLM feedback is generated in
// the profile's language by the prompt itself).
const S = {
  tr: {
    correct: "Doğru! 🌸",
    correctAnswer: (a: string) => `Doğru cevap: ${a}`,
    selfCorrect: "Kendi değerlendirmen: doğru 🌸",
    selfWrong: (a: string) => `Kendi değerlendirmen: yanlış. Doğru cevap: ${a}`,
  },
  en: {
    correct: "Correct! 🌸",
    correctAnswer: (a: string) => `Correct answer: ${a}`,
    selfCorrect: "Self-check: correct 🌸",
    selfWrong: (a: string) => `Self-check: wrong. Correct answer: ${a}`,
  },
};

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
  const userResponse = parsed.data.response;
  const selfVerdict = parsed.data.selfVerdict;

  const exercise = db.query.exercises
    .findFirst({ where: eq(tables.exercises.id, id) })
    .sync();
  if (!exercise) {
    return NextResponse.json({ error: "Alıştırma bulunamadı" }, { status: 404 });
  }
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }

  // Reading-tolerant: romaji matches kana for ja ("konnichiwa" = こんにちは),
  // toneless pinyin matches toned for zh ("ni hao" = "nǐ hǎo"). See lib/jp.ts
  // and lib/zh.ts.
  const accepted = [exercise.answer, ...(exercise.acceptAlso ?? [])].map(
    stripFurigana
  );
  const isExactMatch = accepted.some((a) =>
    answersMatchFor(profile.targetLanguage, a, userResponse)
  );

  let result: {
    isCorrect: boolean;
    score: number;
    feedbackTr: string;
    gradedBy: "deterministic" | "llm" | "self";
  };

  if (exercise.grading === "deterministic" || isExactMatch) {
    const t = pick(S, profile.uiLanguage);
    result = isExactMatch
      ? {
          isCorrect: true,
          score: 100,
          feedbackTr: t.correct,
          gradedBy: "deterministic",
        }
      : {
          isCorrect: false,
          score: 0,
          feedbackTr: t.correctAnswer(exercise.answer),
          gradedBy: "deterministic",
        };
  } else {
    // Same answer resubmitted → reuse the previous LLM verdict instead of
    // paying for an identical grading call.
    const priorSame = db.query.attempts
      .findMany({
        where: eq(tables.attempts.exerciseId, exercise.id),
        orderBy: [desc(tables.attempts.createdAt)],
        limit: 20,
      })
      .sync()
      .find(
        (a) =>
          a.gradedBy === "llm" &&
          a.isCorrect !== null &&
          answersMatchFor(profile.targetLanguage, a.response, userResponse)
      );

    if (priorSame) {
      result = {
        isCorrect: priorSame.isCorrect!,
        score: priorSame.score ?? (priorSame.isCorrect ? 100 : 0),
        feedbackTr: priorSame.feedbackTr ?? "",
        gradedBy: "llm",
      };
    } else if (!llmConfigured()) {
      // LLM'siz self-check: ilk POST beklenen cevabı döner (kayıt yok);
      // ikinci POST selfVerdict ile gelir, "self" olarak kaydedilir.
      if (typeof selfVerdict !== "boolean") {
        return NextResponse.json({
          needsSelfCheck: true,
          expected: {
            answer: exercise.answer,
            acceptAlso: exercise.acceptAlso ?? [],
          },
        });
      }
      const t = pick(S, profile.uiLanguage);
      result = {
        isCorrect: selfVerdict,
        score: selfVerdict ? 100 : 0,
        feedbackTr: selfVerdict ? t.selfCorrect : t.selfWrong(exercise.answer),
        gradedBy: "self",
      };
    } else {
      const { system, prompt } = gradingPrompt({
        targetLanguage: profile.targetLanguage,
        nativeLanguage: profile.nativeLanguage,
        exerciseType: exercise.type,
        promptTr: exercise.promptTr,
        targetText: exercise.targetText,
        expectedAnswer: exercise.answer,
        acceptAlso: exercise.acceptAlso,
        userResponse,
      });
      const grade = await getProvider().generateJson({
        system,
        prompt,
        schema: GradeSchema,
        fixtureKey: "grade",
        tier: exercise.type === "free_response" ? "balanced" : "fast",
        timeoutMs: 90_000,
        urgent: true, // user is staring at "Hoca düşünüyor..."
      });
      result = {
        isCorrect: grade.correct,
        score: grade.score,
        feedbackTr: grade.feedback_tr,
        gradedBy: "llm",
      };
    }
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
