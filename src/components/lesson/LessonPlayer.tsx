"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { CozyButton } from "@/components/shared/CozyButton";
import { StatsHeader } from "@/components/shared/StatsHeader";

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

export function LessonPlayer({ nodeId }: { nodeId: string }) {
  const router = useRouter();
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
      if (!res.ok) throw new Error((await res.json()).error ?? "Açılamadı");
      const body: OpenResponse = await res.json();
      if (stopped.current) return;
      setData(body);
      if (body.status === "generating") {
        setTimeout(open, 3000);
      }
    } catch (e) {
      if (!stopped.current)
        setError(e instanceof Error ? e.message : "Bir şeyler ters gitti");
    }
  }, [nodeId]);

  useEffect(() => {
    stopped.current = false;
    open();
    return () => {
      stopped.current = true;
    };
  }, [open]);

  const finish = useCallback(async () => {
    const res = await fetch(`/api/nodes/${nodeId}/complete`, {
      method: "POST",
    });
    const body = await res.json();
    setCompletion({ xpAwarded: body.xpAwarded, newCards: body.newCards });
    setPhase("done");
  }, [nodeId]);

  if (error) {
    return (
      <Centered>
        <div className="text-4xl">🍂</div>
        <p className="text-ink-soft">{error}</p>
        <CozyButton onClick={() => router.push("/map")}>Haritaya dön</CozyButton>
      </Centered>
    );
  }

  if (!data || data.status === "generating") {
    return (
      <Centered>
        <div className="animate-float-slow text-5xl">🖌️</div>
        <h1 className="text-xl font-semibold">Dersin hazırlanıyor</h1>
        <p className="text-sm text-ink-soft">
          Kumo bu dersi sana özel yazıyor — ilk açılışta biraz sürer, sonra
          hep hazır olacak.
        </p>
        <Dots />
      </Centered>
    );
  }

  const { lesson, exercises = [], node } = data;
  if (!lesson || !node) return null;

  if (phase === "done" && completion) {
    return (
      <Centered>
        <div className="text-6xl">🎉</div>
        <h1 className="text-2xl font-semibold">Ders tamamlandı!</h1>
        <div className="flex gap-3">
          <Badge>✦ +{completion.xpAwarded} XP</Badge>
          {completion.newCards > 0 && (
            <Badge>🔁 {completion.newCards} yeni kart</Badge>
          )}
        </div>
        <p className="text-sm text-ink-soft">
          Alıştırmalar: {correctCount}/{exercises.length} doğru
        </p>
        <CozyButton onClick={() => router.push("/map")}>
          Haritaya dön
        </CozyButton>
      </Centered>
    );
  }

  return (
    <div className="min-h-dvh pb-16">
      <StatsHeader title={lesson.titleTr} backHref="/map" />
      <main className="mx-auto max-w-2xl px-4 py-8">
        {phase === "explanation" && (
          <div className="flex flex-col gap-6">
            <section className="rounded-cozy bg-surface p-6 shadow-cozy prose-cozy">
              <ReactMarkdown>{lesson.explanationTr}</ReactMarkdown>
            </section>

            <section className="rounded-cozy bg-surface p-6 shadow-cozy">
              <h2 className="mb-4 text-lg font-semibold">Örnekler</h2>
              <div className="flex flex-col gap-4">
                {lesson.examples.map((ex, i) => (
                  <div key={i} className="rounded-xl bg-background p-4">
                    <div lang="ja" className="text-xl">
                      {ex.target}
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
                <h2 className="mb-3 text-lg font-semibold">Gramer notları</h2>
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
              Alıştırmalara geç →
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
  const [response, setResponse] = useState("");
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [grading, setGrading] = useState(false);

  const submit = async (value: string) => {
    setGrading(true);
    try {
      const res = await fetch(`/api/exercises/${exercise.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: value }),
      });
      setResult(await res.json());
    } finally {
      setGrading(false);
    }
  };

  return (
    <div className="rounded-cozy bg-surface p-6 shadow-cozy">
      <div className="mb-4 flex items-center justify-between text-xs font-semibold text-ink-soft">
        <span>
          Alıştırma {index + 1} / {total}
        </span>
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
        <div lang="ja" className="mt-3 rounded-xl bg-background p-4 text-xl">
          {exercise.targetText}
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
                <span lang="ja">{opt}</span>
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
                placeholder="Cevabını yaz..."
                className="w-full resize-none rounded-xl border-2 border-surface-2 bg-background px-4 py-3 outline-none focus:border-accent"
              />
            ) : (
              <input
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                disabled={!!result}
                placeholder="Cevabını yaz..."
                className="w-full rounded-xl border-2 border-surface-2 bg-background px-4 py-3 outline-none focus:border-accent"
              />
            )}
            {!result && (
              <CozyButton
                type="submit"
                disabled={grading || !response.trim()}
                className="self-end"
              >
                {grading ? "Hoca düşünüyor..." : "Kontrol et"}
              </CozyButton>
            )}
          </form>
        )}
      </div>

      {result && (
        <div
          className={`mt-4 rounded-xl px-4 py-3 ${
            result.isCorrect ? "bg-moss-soft" : "bg-danger/10"
          }`}
        >
          <div className="font-semibold">
            {result.isCorrect ? "Doğru! 🌸" : "Olmadı 🍂"}
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
            {index + 1 < total ? "Sıradaki →" : "Dersi bitir 🎉"}
          </CozyButton>
        </div>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
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
