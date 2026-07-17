"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { JpMarkdown } from "@/components/shared/JpMarkdown";
import { CozyButton } from "@/components/shared/CozyButton";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { Furigana } from "@/components/shared/Furigana";
import { useProfileMeta } from "@/lib/use-profile-meta";
import { useStrings } from "@/lib/i18n/use-strings";

const S = {
  tr: {
    openFailed: "Açılamadı",
    genericError: "Bir şeyler ters gitti",
    regenFailed: "Yenilenemedi",
    close: "Kapat",
    backToLessons: "Derslere dön",
    preparingTitle: "Dersin hazırlanıyor",
    preparingHint:
      "Kumo bu dersi sana özel yazıyor — ilk açılışta biraz sürer, sonra hep hazır olacak.",
    closeGenInBg: "Kapat (üretim arkada sürer)",
    backGenInBg: "← Derslere dön (üretim arkada sürer)",
    lessonDone: "Ders tamamlandı!",
    newCards: (n: number) => `🔁 ${n} yeni kart`,
    exercisesScore: (c: number, n: number) => `Alıştırmalar: ${c}/${n} doğru`,
    continueBtn: "Devam et →",
    regenTitle: "Dersi yeni sorularla baştan üret",
    examples: "Örnekler",
    grammarNotes: "Gramer notları",
    toExercises: "Alıştırmalara geç →",
    exerciseProgress: (i: number, n: number) => `Alıştırma ${i} / ${n}`,
    gradeFailed: "Değerlendirme başarısız oldu",
    gradeErrorFallback: "Değerlendirme sırasında bir sorun çıktı.",
    answerPlaceholder: "Cevabını yaz...",
    answerPlaceholderJa: "Cevabını yaz (romaji olur: konnichiwa)...",
    answerPlaceholderZh: "Cevabını yaz (pinyin olur: ni hao)...",
    thinking: "Hoca düşünüyor...",
    check: "Kontrol et",
    retry: "Tekrar dene",
    skip: "Atla →",
    correct: "Doğru! 🌸",
    wrong: "Olmadı 🍂",
    next: "Sıradaki →",
    finishLesson: "Dersi bitir 🎉",
  },
  en: {
    openFailed: "Could not open",
    genericError: "Something went wrong",
    regenFailed: "Could not regenerate",
    close: "Close",
    backToLessons: "Back to lessons",
    preparingTitle: "Your lesson is being prepared",
    preparingHint:
      "Kumo is writing this lesson just for you — the first open takes a while, then it's always ready.",
    closeGenInBg: "Close (generation continues in the background)",
    backGenInBg: "← Back to lessons (generation continues in the background)",
    lessonDone: "Lesson complete!",
    newCards: (n: number) => `🔁 ${n} new cards`,
    exercisesScore: (c: number, n: number) => `Exercises: ${c}/${n} correct`,
    continueBtn: "Continue →",
    regenTitle: "Regenerate the lesson with fresh questions",
    examples: "Examples",
    grammarNotes: "Grammar notes",
    toExercises: "Go to exercises →",
    exerciseProgress: (i: number, n: number) => `Exercise ${i} / ${n}`,
    gradeFailed: "Grading failed",
    gradeErrorFallback: "Something went wrong while grading.",
    answerPlaceholder: "Type your answer...",
    answerPlaceholderJa: "Type your answer (romaji works: konnichiwa)...",
    answerPlaceholderZh: "Type your answer (pinyin works: ni hao)...",
    thinking: "Teacher is thinking...",
    check: "Check",
    retry: "Try again",
    skip: "Skip →",
    correct: "Correct! 🌸",
    wrong: "Not quite 🍂",
    next: "Next →",
    finishLesson: "Finish lesson 🎉",
  },
};

interface ExerciseDto {
  id: string;
  type: "mcq" | "fill_blank" | "translate" | "free_response";
  promptTr: string;
  targetText: string | null;
  options: string[] | null;
}

interface LessonDto {
  titleTr: string;
  explanationTr: string;
  examples: {
    target: string;
    reading?: string | null;
    translation_tr: string;
    note_tr?: string | null;
  }[];
  grammarNotes: { heading_tr: string; body_tr: string }[];
  vocab: { term: string; reading?: string | null; meaning_tr: string }[];
}

interface OpenResponse {
  status: "ready" | "generating";
  jobId?: string;
  node?: {
    id: string;
    titleTr: string;
    lessonType: string;
    xpReward: number;
    status: string;
  };
  lesson?: LessonDto;
  exercises?: ExerciseDto[];
}

interface AttemptResult {
  isCorrect: boolean;
  score: number;
  feedbackTr: string;
  xpAwarded: number;
}

type Phase = "explanation" | "exercises" | "done";

/**
 * Two render modes: standalone (/lesson/[nodeId] deep link — own header,
 * exit navigates to /map) and embedded (drawer over the map — compact sticky
 * header with a close button, exit closes the drawer, completion notifies the
 * map so it can refresh without losing scroll).
 */
export function LessonPlayer({
  nodeId,
  embedded = false,
  onExit,
  onCompleted,
}: {
  nodeId: string;
  embedded?: boolean;
  onExit?: () => void;
  onCompleted?: () => void;
}) {
  const t = useStrings(S);
  const router = useRouter();
  const exit = useCallback(() => {
    if (onExit) onExit();
    else router.push("/map");
  }, [onExit, router]);
  const [data, setData] = useState<OpenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("explanation");
  const [exIdx, setExIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [completion, setCompletion] = useState<{
    xpAwarded: number;
    newCards: number;
  } | null>(null);
  const stopped = useRef(false);

  const open = useCallback(async () => {
    try {
      const res = await fetch(`/api/nodes/${nodeId}/open`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? t.openFailed);
      const body: OpenResponse = await res.json();
      if (stopped.current) return;
      setData(body);
      if (body.status === "generating") {
        setTimeout(open, 3000);
      }
    } catch (e) {
      if (!stopped.current)
        setError(e instanceof Error ? e.message : t.genericError);
    }
  }, [nodeId, t]);

  useEffect(() => {
    stopped.current = false;
    open();
    return () => {
      stopped.current = true;
    };
  }, [open]);

  // Throw the cached lesson away and rebuild it under the current prompt
  // (better exercises). Resets local progress; the node's status is kept.
  const regenerate = useCallback(async () => {
    setData(null);
    setPhase("explanation");
    setExIdx(0);
    setCorrectCount(0);
    try {
      const res = await fetch(`/api/nodes/${nodeId}/regenerate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? t.regenFailed);
      open();
    } catch (e) {
      if (!stopped.current)
        setError(e instanceof Error ? e.message : t.regenFailed);
    }
  }, [nodeId, open, t]);

  const finish = useCallback(async () => {
    const res = await fetch(`/api/nodes/${nodeId}/complete`, {
      method: "POST",
    });
    const body = await res.json();
    setCompletion({ xpAwarded: body.xpAwarded, newCards: body.newCards });
    setPhase("done");
    onCompleted?.();
  }, [nodeId, onCompleted]);

  if (error) {
    return (
      <Centered embedded={embedded}>
        <div className="text-4xl">🍂</div>
        <p className="text-ink-soft">{error}</p>
        <CozyButton onClick={exit}>
          {embedded ? t.close : t.backToLessons}
        </CozyButton>
      </Centered>
    );
  }

  if (!data || data.status === "generating") {
    return (
      <Centered embedded={embedded}>
        <div className="animate-float-slow text-5xl">🖌️</div>
        <h1 className="text-xl font-semibold">{t.preparingTitle}</h1>
        <p className="text-sm text-ink-soft">{t.preparingHint}</p>
        <Dots />
        {embedded ? (
          <button
            onClick={exit}
            className="mt-2 rounded-full bg-surface-2 px-4 py-2 text-sm hover:bg-accent-soft transition-colors cursor-pointer"
          >
            {t.closeGenInBg}
          </button>
        ) : (
          <Link
            href="/map"
            className="mt-2 rounded-full bg-surface-2 px-4 py-2 text-sm hover:bg-accent-soft transition-colors"
          >
            {t.backGenInBg}
          </Link>
        )}
      </Centered>
    );
  }

  const { lesson, exercises = [], node } = data;
  if (!lesson || !node) return null;

  if (phase === "done" && completion) {
    return (
      <Centered embedded={embedded}>
        <div className="text-6xl">🎉</div>
        <h1 className="text-2xl font-semibold">{t.lessonDone}</h1>
        <div className="flex gap-3">
          <Badge>✦ +{completion.xpAwarded} XP</Badge>
          {completion.newCards > 0 && (
            <Badge>{t.newCards(completion.newCards)}</Badge>
          )}
        </div>
        <p className="text-sm text-ink-soft">
          {t.exercisesScore(correctCount, exercises.length)}
        </p>
        <CozyButton onClick={exit}>
          {embedded ? t.continueBtn : t.backToLessons}
        </CozyButton>
      </Centered>
    );
  }

  return (
    <div className={embedded ? "" : "min-h-dvh pb-16"}>
      {embedded ? (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-surface-2 bg-surface/95 px-5 py-3 backdrop-blur">
          <h2 className="truncate font-display text-lg font-semibold">
            {lesson.titleTr}
          </h2>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={regenerate}
              title={t.regenTitle}
              className="rounded-full bg-surface-2 px-3 py-1.5 text-sm hover:bg-accent-soft transition-colors cursor-pointer"
            >
              ↻
            </button>
            <button
              onClick={exit}
              title={t.close}
              className="rounded-full bg-surface-2 px-3 py-1.5 text-sm hover:bg-accent-soft transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <StatsHeader title={lesson.titleTr} />
      )}
      <main className="mx-auto max-w-3xl px-4 py-8">
        {phase === "explanation" && (
          <div className="flex flex-col gap-6">
            <section className="rounded-cozy bg-surface p-6 shadow-cozy prose-cozy">
              <JpMarkdown>{lesson.explanationTr}</JpMarkdown>
            </section>

            <section className="rounded-cozy bg-surface p-6 shadow-cozy">
              <h2 className="mb-4 text-lg font-semibold">{t.examples}</h2>
              <div className="flex flex-col gap-4">
                {lesson.examples.map((ex, i) => (
                  <div key={i} className="rounded-xl bg-background p-4">
                    <div className="text-xl">
                      <Furigana text={ex.target} />
                    </div>
                    {ex.reading && (
                      <div className="text-sm text-ink-soft">{ex.reading}</div>
                    )}
                    <div className="mt-1 text-sm font-medium">
                      {ex.translation_tr}
                    </div>
                    {ex.note_tr && (
                      <div className="mt-1 text-xs text-moss">💡 {ex.note_tr}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {lesson.grammarNotes.length > 0 && (
              <section className="rounded-cozy bg-surface p-6 shadow-cozy">
                <h2 className="mb-3 text-lg font-semibold">{t.grammarNotes}</h2>
                {lesson.grammarNotes.map((n, i) => (
                  <div key={i} className="mb-3 last:mb-0">
                    <div className="font-semibold text-accent">
                      {n.heading_tr}
                    </div>
                    <p className="text-sm text-ink-soft">{n.body_tr}</p>
                  </div>
                ))}
              </section>
            )}

            <CozyButton
              className="self-center"
              onClick={() =>
                exercises.length > 0 ? setPhase("exercises") : finish()
              }
            >
              {t.toExercises}
            </CozyButton>
          </div>
        )}

        {phase === "exercises" && exercises[exIdx] && (
          <ExerciseCard
            key={exercises[exIdx].id}
            exercise={exercises[exIdx]}
            index={exIdx}
            total={exercises.length}
            onNext={(wasCorrect) => {
              if (wasCorrect) setCorrectCount((c) => c + 1);
              if (exIdx + 1 < exercises.length) setExIdx((i) => i + 1);
              else finish();
            }}
          />
        )}
      </main>
    </div>
  );
}

function ExerciseCard({
  exercise,
  index,
  total,
  onNext,
}: {
  exercise: ExerciseDto;
  index: number;
  total: number;
  onNext: (wasCorrect: boolean) => void;
}) {
  const t = useStrings(S);
  const [response, setResponse] = useState("");
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const targetLanguage = useProfileMeta()?.targetLanguage;

  const submit = async (value: string) => {
    setGrading(true);
    setGradeError(null);
    try {
      const res = await fetch(`/api/exercises/${exercise.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: value }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error ?? t.gradeFailed);
      }
      setResult(body);
    } catch (e) {
      setGradeError(
        e instanceof Error && e.message !== "Failed to fetch"
          ? e.message
          : t.gradeErrorFallback
      );
    } finally {
      setGrading(false);
    }
  };

  return (
    <div className="rounded-cozy bg-surface p-6 shadow-cozy">
      <div className="mb-4 flex items-center justify-between text-xs font-semibold text-ink-soft">
        <span>{t.exerciseProgress(index + 1, total)}</span>
        <div className="flex gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-4 rounded-full ${
                i < index ? "bg-moss" : i === index ? "bg-accent" : "bg-surface-2"
              }`}
            />
          ))}
        </div>
      </div>

      <h2 className="text-lg font-semibold">{exercise.promptTr}</h2>
      {exercise.targetText && (
        <div className="mt-3 rounded-xl bg-background p-4 text-xl">
          <Furigana text={exercise.targetText} />
        </div>
      )}

      <div className="mt-5">
        {exercise.type === "mcq" && exercise.options ? (
          <div className="grid gap-2">
            {exercise.options.map((opt) => (
              <button
                key={opt}
                disabled={!!result || grading}
                onClick={() => {
                  setResponse(opt);
                  submit(opt);
                }}
                className={`rounded-xl border-2 px-4 py-3 text-left transition-all cursor-pointer disabled:cursor-default ${
                  result && opt === response
                    ? result.isCorrect
                      ? "border-moss bg-moss-soft"
                      : "border-danger bg-danger/10"
                    : "border-surface-2 bg-background hover:border-accent-soft"
                }`}
              >
                <Furigana text={opt} />
              </button>
            ))}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (response.trim()) submit(response);
            }}
            className="flex flex-col gap-3"
          >
            {exercise.type === "free_response" ? (
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                disabled={!!result}
                rows={3}
                placeholder={t.answerPlaceholder}
                className="w-full resize-none rounded-xl border-2 border-surface-2 bg-background px-4 py-3 outline-none focus:border-accent"
              />
            ) : (
              <input
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                disabled={!!result}
                placeholder={
                  targetLanguage === "ja"
                    ? t.answerPlaceholderJa
                    : targetLanguage === "zh"
                      ? t.answerPlaceholderZh
                      : t.answerPlaceholder
                }
                className="w-full rounded-xl border-2 border-surface-2 bg-background px-4 py-3 outline-none focus:border-accent"
              />
            )}
            {!result && (
              <CozyButton
                type="submit"
                disabled={grading || !response.trim()}
                className="self-end"
              >
                {grading ? t.thinking : t.check}
              </CozyButton>
            )}
          </form>
        )}
      </div>

      {gradeError && !result && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-danger/10 px-4 py-3">
          <p className="text-sm">🍂 {gradeError}</p>
          <div className="flex gap-2">
            <CozyButton
              variant="soft"
              className="px-4 py-2 text-sm"
              onClick={() => submit(response)}
            >
              {t.retry}
            </CozyButton>
            <CozyButton
              variant="ghost"
              className="px-4 py-2 text-sm"
              onClick={() => onNext(false)}
            >
              {t.skip}
            </CozyButton>
          </div>
        </div>
      )}

      {result && (
        <div
          className={`mt-4 rounded-xl px-4 py-3 ${
            result.isCorrect ? "bg-moss-soft" : "bg-danger/10"
          }`}
        >
          <div className="font-semibold">
            {result.isCorrect ? t.correct : t.wrong}
            {result.xpAwarded > 0 && (
              <span className="ml-2 text-sm text-gold">+{result.xpAwarded} XP</span>
            )}
          </div>
          <p className="text-sm">{result.feedbackTr}</p>
          <CozyButton
            className="mt-3"
            variant="soft"
            onClick={() => onNext(result.isCorrect)}
          >
            {index + 1 < total ? t.next : t.finishLesson}
          </CozyButton>
        </div>
      )}
    </div>
  );
}

function Centered({
  children,
  embedded = false,
}: {
  children: React.ReactNode;
  embedded?: boolean;
}) {
  return (
    <div
      className={`mx-auto flex max-w-md flex-col items-center justify-center gap-4 px-6 text-center ${
        embedded ? "min-h-[70dvh] py-10" : "min-h-dvh"
      }`}
    >
      {children}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-surface px-4 py-2 font-semibold shadow-cozy">
      {children}
    </span>
  );
}

function Dots() {
  return (
    <div className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2.5 w-2.5 animate-bounce rounded-full bg-accent"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  );
}
