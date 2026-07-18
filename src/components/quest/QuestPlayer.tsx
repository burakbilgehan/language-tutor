"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CozyButton } from "@/components/shared/CozyButton";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { CenteredPage } from "@/components/shared/CenteredPage";
import { Furigana } from "@/components/shared/Furigana";
import { answersMatch, stripFurigana } from "@/lib/jp";
import { useStrings } from "@/lib/i18n/use-strings";
import { completeNodeApi, questStart } from "@/lib/client-api";

const S = {
  tr: {
    startFailed: "Başlatılamadı",
    backToMap: "Haritaya dön",
    preparingTitle: "Görev hazırlanıyor",
    preparingHint: "Sana taze sorular yazılıyor...",
    questDone: "Görev tamam!",
    score: (c: number, n: number) => `${c}/${n} doğru`,
    answerPlaceholder: "Cevabın...",
    correct: "Doğru! 🌸",
    answerLabel: "Cevap: ",
    next: "Sıradaki →",
    finish: "Bitir 🏅",
  },
  en: {
    startFailed: "Could not start",
    backToMap: "Back to map",
    preparingTitle: "Preparing your quest",
    preparingHint: "Fresh questions are being written for you...",
    questDone: "Quest complete!",
    score: (c: number, n: number) => `${c}/${n} correct`,
    answerPlaceholder: "Your answer...",
    correct: "Correct! 🌸",
    answerLabel: "Answer: ",
    next: "Next →",
    finish: "Finish 🏅",
  },
};

interface QuestItem {
  type: "mcq" | "type_answer";
  prompt_tr: string;
  target_text?: string | null;
  options?: string[] | null;
  answer: string;
}

interface QuestData {
  node: { id: string; titleTr: string; xpReward: number };
  quest: { title_tr: string; items: QuestItem[] };
}

export function QuestPlayer({ nodeId }: { nodeId: string }) {
  const t = useStrings(S);
  const router = useRouter();
  const [data, setData] = useState<QuestData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [response, setResponse] = useState("");
  const [outcome, setOutcome] = useState<null | { correct: boolean }>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return; // guard double-invoke in dev StrictMode
    startedRef.current = true;
    questStart(nodeId)
      .then((d) => setData(d as QuestData))
      .catch((e) => setError(e.message));
  }, [nodeId, t]);

  const finish = useCallback(async () => {
    const body = await completeNodeApi(nodeId).catch(() => null);
    setXpAwarded(body?.xpAwarded ?? 0);
  }, [nodeId]);

  if (error) {
    return (
      <Center>
        <div className="text-4xl">🍂</div>
        <p className="text-ink-soft">{error}</p>
        <CozyButton onClick={() => router.push("/map")}>{t.backToMap}</CozyButton>
      </Center>
    );
  }

  if (!data) {
    return (
      <Center>
        <div className="animate-float-slow text-5xl">🎲</div>
        <h1 className="text-xl font-semibold">{t.preparingTitle}</h1>
        <p className="text-sm text-ink-soft">{t.preparingHint}</p>
      </Center>
    );
  }

  const items = data.quest.items;

  if (xpAwarded !== null) {
    return (
      <Center>
        <div className="text-6xl">🏅</div>
        <h1 className="text-2xl font-semibold">{t.questDone}</h1>
        <p className="text-ink-soft">
          {t.score(correctCount, items.length)} · <span className="text-gold font-semibold">+{xpAwarded} XP</span>
        </p>
        <CozyButton onClick={() => router.push("/map")}>{t.backToMap}</CozyButton>
      </Center>
    );
  }

  const item = items[idx];
  const check = (value: string) => {
    const correct = answersMatch(stripFurigana(item.answer), value);
    if (correct) setCorrectCount((c) => c + 1);
    setOutcome({ correct });
  };
  const next = () => {
    setOutcome(null);
    setResponse("");
    if (idx + 1 < items.length) setIdx((i) => i + 1);
    else finish();
  };

  return (
    <div className="min-h-dvh">
      <StatsHeader title={data.quest.title_tr} />
      <main className="mx-auto max-w-md px-4 py-8">
        <div className="mb-4 flex justify-center gap-1">
          {items.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-3 rounded-full ${
                i < idx ? "bg-moss" : i === idx ? "bg-accent" : "bg-surface-2"
              }`}
            />
          ))}
        </div>

        <div className="rounded-cozy bg-surface p-6 shadow-cozy">
          <h2 className="font-semibold">{item.prompt_tr}</h2>
          {item.target_text && (
            <div className="my-4 rounded-xl bg-background p-6 text-center text-5xl">
              <Furigana text={item.target_text} />
            </div>
          )}

          {item.type === "mcq" && item.options ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {item.options.map((opt) => (
                <button
                  key={opt}
                  disabled={!!outcome}
                  onClick={() => {
                    setResponse(opt);
                    check(opt);
                  }}
                  className={`rounded-xl border-2 px-4 py-3 text-center text-lg transition-all cursor-pointer disabled:cursor-default ${
                    outcome && opt === response
                      ? outcome.correct
                        ? "border-moss bg-moss-soft"
                        : "border-danger bg-danger/10"
                      : outcome && answersMatch(stripFurigana(item.answer), opt)
                        ? "border-moss bg-moss-soft"
                        : "border-surface-2 bg-background hover:border-accent-soft"
                  }`}
                >
                  <Furigana text={opt} />
                </button>
              ))}
            </div>
          ) : (
            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!outcome && response.trim()) check(response);
              }}
            >
              <input
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                disabled={!!outcome}
                autoFocus
                placeholder={t.answerPlaceholder}
                className="flex-1 rounded-xl border-2 border-surface-2 bg-background px-4 py-3 outline-none focus:border-accent"
              />
              {!outcome && (
                <CozyButton type="submit" disabled={!response.trim()}>
                  ✓
                </CozyButton>
              )}
            </form>
          )}

          {outcome && (
            <div
              className={`mt-4 flex items-center justify-between rounded-xl px-4 py-3 ${
                outcome.correct ? "bg-moss-soft" : "bg-danger/10"
              }`}
            >
              <span className="font-semibold">
                {outcome.correct ? (
                  t.correct
                ) : (
                  <>
                    {t.answerLabel}
                    <Furigana text={item.answer} />
                  </>
                )}
              </span>
              <CozyButton variant="soft" onClick={next}>
                {idx + 1 < items.length ? t.next : t.finish}
              </CozyButton>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <CenteredPage>{children}</CenteredPage>;
}
