import { and, asc, count, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as tables from "@/db/schema";
import { stripFurigana } from "@/lib/jp";
import { answersMatchFor } from "@/lib/answers";
import { pick } from "@/lib/i18n";
import type { LessonContent } from "@/lib/llm/schemas";
import { readLangContent, type NativeLang } from "@/lib/llm/lang-content";
import { awardXp } from "./xp";
import { completeNode } from "./roadmap";
import type { AppDb } from "./db-types";

// Ders akışının ortam-bağımsız çekirdeği: aç (cache'ten), tamamla (SRS
// hasadı + XP), egzersiz değerlendir (deterministik + self-check + opsiyonel
// LLM callback'i). Job/prefetch/auto-extend sunucu sarmalayıcılarında kalır;
// tarayıcı LLM katmanı geldiğinde llmGrade callback'i oradan da beslenecek.

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

export type OpenNodeResult =
  | { status: "notFound" }
  | { status: "locked" }
  | { status: "needsGeneration" }
  | {
      status: "ready";
      node: {
        id: string;
        titleTr: string;
        subtitleTr: string | null;
        lessonType: string | null;
        xpReward: number;
        status: string;
      };
      lesson: {
        titleTr: string;
        explanationTr: string;
        examples: unknown;
        grammarNotes: unknown;
        vocab: unknown;
      };
      exercises: {
        id: string;
        type: string;
        promptTr: string;
        targetText: string | null;
        options: string[] | null;
      }[];
    };

/** Cache'li dersi servis eder; hazır değilse needsGeneration (üretim kararı
 * çağıranda: sunucu job kuyruğuna atar, statik mod LLM katmanına gider). */
export function openNode(
  db: AppDb,
  nodeId: string,
  nativeLang: NativeLang = "tr"
): OpenNodeResult {
  const node = db
    .select()
    .from(tables.nodes)
    .where(eq(tables.nodes.id, nodeId))
    .limit(1)
    .get();
  if (!node) return { status: "notFound" };
  if (node.status === "locked") return { status: "locked" };

  const lesson = db
    .select()
    .from(tables.lessons)
    .where(eq(tables.lessons.nodeId, nodeId))
    .limit(1)
    .get();
  // Language-mismatch gate: content generated in another native language is
  // treated as absent so the lesson regenerates in the current one (T-031).
  const content =
    lesson?.status === "ready"
      ? readLangContent<LessonContent>(lesson.content, nativeLang)
      : null;
  if (!lesson || !content) {
    return { status: "needsGeneration" };
  }

  const exercises = db
    .select()
    .from(tables.exercises)
    // Only this native language's exercises — the lesson body came from
    // content[nativeLang], so its exercises must match (T-031).
    .where(
      and(
        eq(tables.exercises.lessonId, lesson.id),
        eq(tables.exercises.lang, nativeLang)
      )
    )
    .orderBy(asc(tables.exercises.position))
    .all()
    .map((e) => ({
      id: e.id,
      type: e.type,
      promptTr: e.promptTr,
      targetText: e.targetText,
      options: e.options,
      // answers stay out of the payload
    }));

  return {
    status: "ready",
    node: {
      id: node.id,
      titleTr: node.titleTr,
      subtitleTr: node.subtitleTr,
      lessonType: node.lessonType,
      xpReward: node.xpReward,
      status: node.status,
    },
    lesson: {
      titleTr: content.title_tr,
      explanationTr: content.explanation_tr,
      examples: content.examples,
      grammarNotes: content.grammar_notes,
      vocab: content.vocab,
    },
    exercises,
  };
}

/** Tamamlama akışı: node completed + ardıl unlock, SRS hasadı, XP.
 * Prefetch/auto-extend çağıranda. */
export function completeNodeFlow(
  db: AppDb,
  nodeId: string,
  profileId: string
): {
  xpAwarded: number;
  newCards: number;
  unlockedNodeIds: string[];
} | null {
  const node = db
    .select()
    .from(tables.nodes)
    .where(eq(tables.nodes.id, nodeId))
    .limit(1)
    .get();
  if (!node) return null;

  const alreadyCompleted = node.status === "completed";
  const unlockedNodeIds = alreadyCompleted ? [] : completeNode(db, nodeId);

  // Harvest lesson vocab into SRS cards (dedup via unique index). Yeni kart
  // sayısı sürücü-bağımsız ölçülür (better-sqlite3 `changes` döner, sql-js
  // dönmez): döngü öncesi/sonrası count farkı.
  let newCards = 0;
  const lesson = db
    .select()
    .from(tables.lessons)
    .where(eq(tables.lessons.nodeId, nodeId))
    .limit(1)
    .get();
  const profileRow = db
    .select({ nativeLanguage: tables.profiles.nativeLanguage })
    .from(tables.profiles)
    .where(eq(tables.profiles.id, profileId))
    .limit(1)
    .get();
  const harvestContent = readLangContent<LessonContent>(
    lesson?.content,
    (profileRow?.nativeLanguage ?? "tr") as NativeLang
  );
  if (!alreadyCompleted && lesson && harvestContent) {
    const cardCount = () =>
      db
        .select({ n: count() })
        .from(tables.srsCards)
        .where(eq(tables.srsCards.profileId, profileId))
        .get()?.n ?? 0;
    const before = cardCount();
    for (const v of harvestContent.vocab) {
      db.insert(tables.srsCards)
        .values({
          id: nanoid(),
          profileId,
          itemType: "vocab",
          front: v.term,
          back: v.meaning_tr,
          // Stamp the native language the `back` is written in (T-035). The
          // harvest content was already resolved for this native language, so
          // the meaning matches. Legacy/pre-v8 rows default 'tr' in schema.
          lang: (profileRow?.nativeLanguage ?? "tr") as NativeLang,
          reading: v.reading ?? null,
          example: v.example ?? null,
          sourceLessonId: lesson.id,
          dueAt: new Date(),
        })
        .onConflictDoNothing()
        .run();
    }
    newCards = cardCount() - before;
  }

  let xpAwarded = 0;
  if (!alreadyCompleted) {
    xpAwarded = node.xpReward;
    // "side_quest" xpEvents.reason stays possible only for legacy quest
    // nodes (T-018 removed side quests going forward); completeNode()
    // above already no-ops for them, so this only fires for main nodes.
    awardXp(db, profileId, xpAwarded, "lesson_complete", nodeId);
  }

  return { xpAwarded, newCards, unlockedNodeIds };
}

export interface AttemptResultDto {
  isCorrect: boolean;
  score: number;
  feedbackTr: string;
  gradedBy: "deterministic" | "llm" | "self";
  xpAwarded: number;
}

export type AttemptOutcome =
  | { kind: "notFound" }
  | {
      kind: "needsSelfCheck";
      expected: { answer: string; acceptAlso: string[] };
    }
  | { kind: "graded"; result: AttemptResultDto };

/**
 * Egzersiz değerlendirme. Sıra: deterministik karşılaştırma → önceki özdeş
 * LLM hükmünün yeniden kullanımı → llmGrade callback'i (varsa) → self-check
 * protokolü (yoksa). Sunucu llmGrade'i provider'dan bağlar; statik mod
 * tarayıcı LLM katmanı gelene kadar self-check'e düşer.
 */
export async function attemptExercise(
  db: AppDb,
  opts: {
    exerciseId: string;
    response: string;
    selfVerdict?: boolean;
    profile: { id: string; targetLanguage: string; uiLanguage: string };
    llmGrade?: (exercise: typeof tables.exercises.$inferSelect) => Promise<{
      correct: boolean;
      score: number;
      feedback_tr: string;
    }>;
  }
): Promise<AttemptOutcome> {
  const exercise = db
    .select()
    .from(tables.exercises)
    .where(eq(tables.exercises.id, opts.exerciseId))
    .limit(1)
    .get();
  if (!exercise) return { kind: "notFound" };

  const { profile } = opts;
  const userResponse = opts.response;

  // Reading-tolerant compare (romaji↔kana, toneless pinyin) — see lib/jp, lib/zh.
  const accepted = [exercise.answer, ...(exercise.acceptAlso ?? [])].map(
    stripFurigana
  );
  const isExactMatch = accepted.some((a) =>
    answersMatchFor(profile.targetLanguage, a, userResponse)
  );

  let result: Omit<AttemptResultDto, "xpAwarded">;

  if (exercise.grading === "deterministic" || isExactMatch) {
    const t = pick(S, profile.uiLanguage);
    result = isExactMatch
      ? { isCorrect: true, score: 100, feedbackTr: t.correct, gradedBy: "deterministic" }
      : {
          isCorrect: false,
          score: 0,
          feedbackTr: t.correctAnswer(exercise.answer),
          gradedBy: "deterministic",
        };
  } else {
    // Same answer resubmitted → reuse the previous LLM verdict.
    const priorSame = db
      .select()
      .from(tables.attempts)
      .where(eq(tables.attempts.exerciseId, exercise.id))
      .orderBy(desc(tables.attempts.createdAt))
      .limit(20)
      .all()
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
    } else if (opts.llmGrade) {
      const grade = await opts.llmGrade(exercise);
      result = {
        isCorrect: grade.correct,
        score: grade.score,
        feedbackTr: grade.feedback_tr,
        gradedBy: "llm",
      };
    } else if (typeof opts.selfVerdict === "boolean") {
      const t = pick(S, profile.uiLanguage);
      result = {
        isCorrect: opts.selfVerdict,
        score: opts.selfVerdict ? 100 : 0,
        feedbackTr: opts.selfVerdict
          ? t.selfCorrect
          : t.selfWrong(exercise.answer),
        gradedBy: "self",
      };
    } else {
      return {
        kind: "needsSelfCheck",
        expected: {
          answer: exercise.answer,
          acceptAlso: exercise.acceptAlso ?? [],
        },
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
    awardXp(db, profile.id, xpAwarded, "exercise", exercise.id);
  }

  return { kind: "graded", result: { ...result, xpAwarded } };
}
