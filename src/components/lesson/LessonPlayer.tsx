"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { JpMarkdown } from "@/components/shared/JpMarkdown";
import { CozyButton } from "@/components/shared/CozyButton";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { CenteredPage } from "@/components/shared/CenteredPage";
import { Furigana } from "@/components/shared/Furigana";
import { SpeakButton } from "@/components/shared/SpeakButton";
import { useProfileMeta } from "@/lib/use-profile-meta";
import { useStrings } from "@/lib/i18n/use-strings";
import { useLocalizeError, resolveUiLang } from "@/lib/i18n/use-localize-error";
import {
  openNodeApi,
  completeNodeApi,
  attemptApi,
  regenerateLesson,
  lessonDiscard,
  retryLessonGen,
  llmConfigGet,
} from "@/lib/client-api";
import { AppError } from "@/lib/errors";
import { diagnoseGenerationFailure } from "@/lib/llm-diagnosis";
import {
  subscribeLessonGen,
  lessonGenState,
  cancelLessonGen,
  clearLessonGen,
} from "@/lib/lesson-gen-store";
import { seededShuffle } from "@/lib/shuffle";

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
    elapsed: (s: number) =>
      s < 60 ? `${s} sn geçti` : `${Math.floor(s / 60)} dk ${s % 60} sn geçti`,
    cancelGeneration: "Vazgeç",
    genFailedTitle: "Ders hazırlanamadı",
    genFailedBody:
      "Son deneme başarısız oldu. Tekrar deneyebilirsin; sorun sürerse Ayarlar'dan bağlantını kontrol et.",
    retryGeneration: "Tekrar dene",
    lessonDone: "Ders tamamlandı!",
    newCards: (n: number) => `🔁 ${n} yeni kart`,
    exercisesScore: (c: number, n: number) => `Alıştırmalar: ${c}/${n} doğru`,
    continueBtn: "Devam et →",
    regenTitle: "Dersi yeni sorularla baştan üret",
    regenPromptTitle: "Neyi düzeltelim?",
    regenPromptHint:
      "Ne yanlış/eksikti? (örn. \"örnekler çok kolay\", \"romaji hatalı\") — boş bırakırsan aynı şekilde yeniden üretilir.",
    regenPlaceholder: "İsteğe bağlı geri bildirim...",
    regenSubmit: "Yeniden üret",
    regenCancel: "Vazgeç",
    // T-082
    discardSubmit: "🗑️ Bu dersi at",
    discardConfirm:
      "Bu dersin içeriği ve alıştırmaları silinecek; dersi bir daha açtığında sıfırdan üretilecek. Tamamlanma durumun ve XP'in korunur. Emin misin?",
    discardFailed: "Ders atılamadı",
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
    selfCheckTitle: "Kendin değerlendir",
    selfCheckHint:
      "LLM bağlı değil — beklenen cevapla karşılaştır ve kendini puanla.",
    selfCheckExpected: "Beklenen cevap",
    selfCheckAlso: "Kabul edilen diğerleri",
    selfCorrectBtn: "Doğru saydım ✓",
    selfWrongBtn: "Yanlıştı ✗",
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
    elapsed: (s: number) =>
      s < 60 ? `${s}s elapsed` : `${Math.floor(s / 60)}m ${s % 60}s elapsed`,
    cancelGeneration: "Cancel",
    genFailedTitle: "The lesson could not be prepared",
    genFailedBody:
      "The last attempt failed. You can try again; if it keeps happening, check your connection in Settings.",
    retryGeneration: "Try again",
    lessonDone: "Lesson complete!",
    newCards: (n: number) => `🔁 ${n} new cards`,
    exercisesScore: (c: number, n: number) => `Exercises: ${c}/${n} correct`,
    continueBtn: "Continue →",
    regenTitle: "Regenerate the lesson with fresh questions",
    regenPromptTitle: "What should we fix?",
    regenPromptHint:
      "What was wrong or missing? (e.g. \"examples too easy\", \"romaji wrong\") — leave blank to regenerate the same way as before.",
    regenPlaceholder: "Optional feedback...",
    regenSubmit: "Regenerate",
    regenCancel: "Cancel",
    // T-082
    discardSubmit: "🗑️ Discard this lesson",
    discardConfirm:
      "This lesson's content and exercises will be deleted; it will be generated from scratch the next time you open it. Your completion state and XP are kept. Are you sure?",
    discardFailed: "Could not discard the lesson",
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
    selfCheckTitle: "Check it yourself",
    selfCheckHint:
      "No LLM connected — compare with the expected answer and grade yourself.",
    selfCheckExpected: "Expected answer",
    selfCheckAlso: "Also accepted",
    selfCorrectBtn: "I got it right ✓",
    selfWrongBtn: "I was wrong ✗",
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
  /** "error" = the last generation attempt failed (T-070-B). Terminates the
   * 3s poll and renders the retry screen instead of an eternal "preparing". */
  status: "ready" | "generating" | "error";
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
  const localize = useLocalizeError();
  const router = useRouter();
  const profileMeta = useProfileMeta();
  const targetLanguage = profileMeta?.targetLanguage;
  const cjkLang = targetLanguage === "ja" || targetLanguage === "zh" ? targetLanguage : null;
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
  const [showRegenForm, setShowRegenForm] = useState(false);
  const [regenFeedback, setRegenFeedback] = useState("");
  const stopped = useRef(false);

  // T-063: reachable in static mode only — generation there runs inline, so
  // openNodeApi/regenerateLesson throw a real LlmError straight into this
  // catch. In server mode a bridge-down failure never reaches here: the
  // lesson job fails async and openNode() (src/core/lesson.ts) reports
  // needsGeneration again rather than surfacing an error, so the route keeps
  // returning {status:"generating"} and this component polls forever without
  // throwing. That gap is in src/core/*/jobs.ts, outside this ticket's fence
  // (see the report for the disclosure) — this helper only closes the static
  // half of the gap, plus regenerate()'s failure path in both modes.
  const diagnose = useCallback(
    async (e: unknown): Promise<string> => {
      const generic = localize(e);
      try {
        const config = await llmConfigGet();
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const diagnosis = await diagnoseGenerationFailure({
          err: e,
          baseUrl: config.baseUrl,
          uiLang: resolveUiLang(profileMeta?.uiLanguage),
          isLocalOrigin: /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin),
          origin,
        });
        return diagnosis.message;
      } catch {
        // Diagnosis failing must never hide the already-computed generic
        // message.
        return generic;
      }
    },
    [localize, profileMeta?.uiLanguage]
  );

  const open = useCallback(async () => {
    try {
      const body = (await openNodeApi(nodeId)) as OpenResponse;
      if (stopped.current) return;
      setData(body);
      if (body.status === "generating") {
        setTimeout(open, 3000);
      }
    } catch (e) {
      const message = await diagnose(e);
      if (!stopped.current) setError(message);
    }
  }, [nodeId, diagnose]);

  useEffect(() => {
    stopped.current = false;
    open();
    return () => {
      stopped.current = true;
    };
  }, [open]);

  // T-070-B: the generation's outcome lives in a module-level store, not in
  // this component. That is the whole point: the user can close the drawer
  // ("generation continues in the background"), this component unmounts, and
  // the failure that lands two minutes later still has somewhere to go. On
  // (re)mount we read the last known state, so a lesson that failed while the
  // drawer was closed shows its error screen instead of "preparing" forever.
  const genState = useSyncExternalStore(
    subscribeLessonGen,
    () => lessonGenState(nodeId),
    () => null
  );

  // Elapsed seconds on the preparing screen (T-070-C): a 2-3 minute wait with
  // no moving number reads as "stuck".
  const [elapsed, setElapsed] = useState(0);
  const genStartedAt = genState?.kind === "running" ? genState.startedAt : null;
  useEffect(() => {
    if (genStartedAt == null) {
      setElapsed(0);
      return;
    }
    const tick = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - genStartedAt) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [genStartedAt]);

  const cancelGeneration = useCallback(() => {
    cancelLessonGen(nodeId);
    exit();
  }, [nodeId, exit]);

  const retryGeneration = useCallback(async () => {
    setError(null);
    setData(null);
    clearLessonGen(nodeId);
    try {
      await retryLessonGen(nodeId);
      if (!stopped.current) open();
    } catch (e) {
      // Statikte store zaten teşhis edip mesajı yazdı; ikinci kez teşhis
      // etmek gereksiz bir probe round-trip'i daha demek. Store'da mesaj
      // varsa render onu genState üstünden alır, burada setError'a gerek yok.
      if (lessonGenState(nodeId)?.kind === "error") return;
      const message = await diagnose(e);
      if (!stopped.current) setError(message);
    }
  }, [nodeId, open, diagnose]);

  // Throw the cached lesson away and rebuild it under the current prompt
  // (better exercises). Resets local progress; the node's status is kept.
  // `feedback` (optional) tells the LLM what was wrong with the previous
  // generation so it doesn't just repeat the same mistake.
  const regenerate = useCallback(
    async (feedback?: string) => {
      setShowRegenForm(false);
      setRegenFeedback("");
      setData(null);
      setPhase("explanation");
      setExIdx(0);
      setCorrectCount(0);
      try {
        await regenerateLesson(nodeId, feedback);
        open();
      } catch (e) {
        const message = await diagnose(e);
        if (!stopped.current) setError(message);
      }
    },
    [nodeId, open, diagnose]
  );

  // T-082. Throw the cached lesson away WITHOUT generating a replacement now:
  // the node regenerates on its next open. Distinct from regenerate() above,
  // which spends a generation immediately and keeps the user waiting. Node
  // completion state and XP are untouched, so the map is unaffected; the user
  // is returned to it because there is no longer a lesson to display.
  const discard = useCallback(async () => {
    if (!window.confirm(t.discardConfirm)) return;
    setShowRegenForm(false);
    setRegenFeedback("");
    try {
      await lessonDiscard(nodeId);
      exit();
    } catch (e) {
      if (!stopped.current) {
        setError(e instanceof AppError ? localize(e) : t.discardFailed);
      }
    }
  }, [nodeId, exit, t, localize]);

  const finish = useCallback(async () => {
    const body = await completeNodeApi(nodeId);
    setCompletion({ xpAwarded: body.xpAwarded, newCards: body.newCards });
    setPhase("done");
    onCompleted?.();
  }, [nodeId, onCompleted]);

  // Üretim başarısız oldu. Üç kaynak aynı ekrana çıkar: açılışta atılan hata
  // (error state), openNode'un ayrı "error" statüsü (T-070-B) ve drawer
  // kapalıyken biten üretimin store'a yazdığı hata. Hepsinde de sessiz
  // otomatik yeniden üretim YOK; "tekrar dene" kullanıcının eylemi.
  // Ders HAZIR ise store'daki eski bir hata kaydı ekranı asla ele geçiremez:
  // hazır içeriği bir yan-durum yüzünden gizlemek render kararı olurdu, oysa
  // bu bir veri kararı. (Bugün ulaşılabilir bir yol yok; tek bir yeni çağrı
  // yeri onu ulaşılabilir kılardı.)
  const genFailedMessage =
    data?.status === "ready"
      ? null
      : (error ??
        (data?.status === "error" && genState?.kind !== "error"
          ? t.genFailedBody
          : genState?.kind === "error"
            ? genState.message
            : null));

  if (genFailedMessage) {
    return (
      <Centered embedded={embedded}>
        <div className="text-4xl">🍂</div>
        <h1 className="text-lg font-semibold">{t.genFailedTitle}</h1>
        <p className="max-w-md text-sm text-ink-soft">{genFailedMessage}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <CozyButton onClick={retryGeneration}>{t.retryGeneration}</CozyButton>
          <button
            onClick={exit}
            className="rounded-full bg-surface-2 px-4 py-2 text-sm hover:bg-accent-soft transition-colors cursor-pointer"
          >
            {embedded ? t.close : t.backToLessons}
          </button>
        </div>
      </Centered>
    );
  }

  if (!data || data.status === "generating") {
    const canCancel = genState?.kind === "running";
    return (
      <Centered embedded={embedded}>
        <div className="animate-float-slow text-5xl">🖌️</div>
        <h1 className="text-xl font-semibold">{t.preparingTitle}</h1>
        <p className="text-sm text-ink-soft">{t.preparingHint}</p>
        <Dots />
        {canCancel && (
          <p className="text-xs tabular-nums text-ink-soft">
            {t.elapsed(elapsed)}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {embedded ? (
            <button
              onClick={exit}
              className="rounded-full bg-surface-2 px-4 py-2 text-sm hover:bg-accent-soft transition-colors cursor-pointer"
            >
              {t.closeGenInBg}
            </button>
          ) : (
            <Link
              href="/map"
              className="rounded-full bg-surface-2 px-4 py-2 text-sm hover:bg-accent-soft transition-colors"
            >
              {t.backGenInBg}
            </Link>
          )}
          {canCancel && (
            <button
              onClick={cancelGeneration}
              className="rounded-full px-4 py-2 text-sm text-ink-soft underline underline-offset-4 hover:text-ink transition-colors cursor-pointer"
            >
              {t.cancelGeneration}
            </button>
          )}
        </div>
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
          <Badge>
            <span className="text-amber-text">✦ +{completion.xpAwarded} XP</span>
          </Badge>
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
        // Opaque on purpose: a backdrop-filter inside the drawer's scroller
        // kicks it off the compositor fast path, so every scrolled frame
        // repaints the whole panel (~80ms/frame, 12fps).
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-surface-2 bg-surface px-5 py-3">
          <h2 className="truncate font-display text-lg font-semibold">
            {lesson.titleTr}
          </h2>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => setShowRegenForm((v) => !v)}
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
      {showRegenForm && (
        <div className="border-b border-surface-2 bg-surface/95 px-5 py-4">
          <div className="mx-auto flex max-w-3xl flex-col gap-2">
            <h3 className="text-sm font-semibold">{t.regenPromptTitle}</h3>
            <p className="text-xs text-ink-soft">{t.regenPromptHint}</p>
            <textarea
              value={regenFeedback}
              onChange={(e) => setRegenFeedback(e.target.value)}
              placeholder={t.regenPlaceholder}
              rows={2}
              className="w-full rounded-xl border border-surface-2 bg-background px-3 py-2 text-sm outline-none focus:border-indigo focus:ring-4 focus:ring-indigo/15"
            />
            <div className="flex gap-2">
              <CozyButton onClick={() => regenerate(regenFeedback)}>
                {t.regenSubmit}
              </CozyButton>
              {/* T-082. Discard sits beside regenerate because it answers the
                  same complaint ("this lesson is bad") with the opposite
                  trade: no LLM call now, fresh content on next open. Kept a
                  plain danger-text button, not a second vermilion action. */}
              <button
                onClick={() => void discard()}
                className="rounded-full bg-surface-2 px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors cursor-pointer"
              >
                {t.discardSubmit}
              </button>
              <button
                onClick={() => {
                  setShowRegenForm(false);
                  setRegenFeedback("");
                }}
                className="rounded-full bg-surface-2 px-4 py-2 text-sm hover:bg-accent-soft transition-colors cursor-pointer"
              >
                {t.regenCancel}
              </button>
            </div>
          </div>
        </div>
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
                    <div className="flex items-center gap-1.5 text-xl">
                      <Furigana text={ex.target} lang={cjkLang} />
                      <SpeakButton text={ex.target} />
                    </div>
                    {ex.reading && (
                      <div className="text-sm text-ink-soft">{ex.reading}</div>
                    )}
                    <div className="mt-1 text-sm font-medium">
                      {ex.translation_tr}
                    </div>
                    {ex.note_tr && (
                      <div className="mt-1 text-xs text-indigo">💡 {ex.note_tr}</div>
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
                    <div className="font-semibold text-indigo">
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
  const localize = useLocalizeError();
  const [response, setResponse] = useState("");
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  // LLM'siz mod: sunucu needsSelfCheck dönerse beklenen cevap gösterilir,
  // kullanıcı kendini puanlar (ikinci POST selfVerdict ile).
  const [selfCheck, setSelfCheck] = useState<{
    answer: string;
    acceptAlso: string[];
  } | null>(null);
  const profileMeta = useProfileMeta();
  const targetLanguage = profileMeta?.targetLanguage;
  const cjkLang = targetLanguage === "ja" || targetLanguage === "zh" ? targetLanguage : null;
  // Remounted per exercise (key={exercises[exIdx].id} above) — an in-flight
  // diagnosis probe from a previous exercise must not setState after this
  // instance is gone.
  const stopped = useRef(false);
  useEffect(() => {
    stopped.current = false;
    return () => {
      stopped.current = true;
    };
  }, []);

  // T-078: LLM-generated mcq options almost always place the correct answer
  // first. Shuffle at render time, seeded on the exercise id so the order
  // stays stable across re-renders and after grading (no mid-exercise
  // reorder), but varies between exercises. Grading compares the selected
  // option's TEXT against `answer` (core/lesson.ts attemptExercise), so
  // display order never affects correctness.
  const shuffledOptions = useMemo(
    () =>
      exercise.options ? seededShuffle(exercise.options, exercise.id) : null,
    [exercise.options, exercise.id]
  );

  const submit = async (value: string, selfVerdict?: boolean) => {
    setGrading(true);
    setGradeError(null);
    try {
      const body = await attemptApi(exercise.id, value, selfVerdict);
      if ("needsSelfCheck" in body) {
        setSelfCheck(body.expected);
        return;
      }
      setSelfCheck(null);
      setResult(body);
    } catch (e) {
      // Free-response/translate grading is the OTHER synchronous LLM call in
      // this file (mcq/fill_blank are deterministic, never reach here) — same
      // bridge-down diagnosis as open()/regenerate() above.
      let message = localize(e);
      try {
        const config = await llmConfigGet();
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const diagnosis = await diagnoseGenerationFailure({
          err: e,
          baseUrl: config.baseUrl,
          uiLang: resolveUiLang(profileMeta?.uiLanguage),
          isLocalOrigin: /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin),
          origin,
        });
        message = diagnosis.message;
      } catch {
        // keep the generic message computed above
      }
      if (!stopped.current) setGradeError(message);
    } finally {
      if (!stopped.current) setGrading(false);
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
                i < index ? "bg-indigo" : i === index ? "bg-accent" : "bg-surface-2"
              }`}
            />
          ))}
        </div>
      </div>

      <h2 className="text-lg font-semibold">{exercise.promptTr}</h2>
      {exercise.targetText && (
        <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-background p-4 text-xl">
          <Furigana text={exercise.targetText} lang={cjkLang} />
          {/* Only "translate" targetText is safe to speak: it's the target-
              language sentence being translated, the answer is the native-
              language text (lesson.ts prompt: target_text / answer split).
              mcq targetText/options and fill_blank are the tested material
              itself (e.g. a reading question); speaking it would hand the
              answer to the learner. */}
          {exercise.type === "translate" && <SpeakButton text={exercise.targetText} />}
        </div>
      )}

      <div className="mt-5">
        {exercise.type === "mcq" && shuffledOptions ? (
          <div className="grid gap-2">
            {shuffledOptions.map((opt) => (
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
                      ? "border-indigo bg-indigo-soft"
                      : "border-danger bg-danger/10"
                    : "border-surface-2 bg-background hover:border-accent-soft"
                }`}
              >
                <Furigana text={opt} lang={cjkLang} />
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
                className="w-full resize-none rounded-xl border-2 border-surface-2 bg-background px-4 py-3 outline-none focus:border-indigo focus:ring-4 focus:ring-indigo/15"
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
                className="w-full rounded-xl border-2 border-surface-2 bg-background px-4 py-3 outline-none focus:border-indigo focus:ring-4 focus:ring-indigo/15"
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

      {selfCheck && !result && (
        <div className="mt-4 rounded-xl bg-surface-2 px-4 py-3">
          <div className="font-semibold">{t.selfCheckTitle}</div>
          <p className="mt-1 text-xs text-ink-soft">{t.selfCheckHint}</p>
          <div className="mt-3 rounded-lg bg-background p-3">
            <div className="text-xs font-semibold text-ink-soft">
              {t.selfCheckExpected}
            </div>
            <div className="mt-1 text-lg">
              <Furigana text={selfCheck.answer} lang={cjkLang} />
            </div>
            {selfCheck.acceptAlso.length > 0 && (
              <div className="mt-2 text-sm text-ink-soft">
                {t.selfCheckAlso}: {selfCheck.acceptAlso.join(" ・ ")}
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <CozyButton
              variant="soft"
              className="px-4 py-2 text-sm"
              disabled={grading}
              onClick={() => submit(response, true)}
            >
              {t.selfCorrectBtn}
            </CozyButton>
            <CozyButton
              variant="ghost"
              className="px-4 py-2 text-sm"
              disabled={grading}
              onClick={() => submit(response, false)}
            >
              {t.selfWrongBtn}
            </CozyButton>
          </div>
        </div>
      )}

      {gradeError && !result && !selfCheck && (
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
            result.isCorrect ? "bg-indigo-soft" : "bg-danger/10"
          }`}
        >
          <div className="font-semibold">
            {result.isCorrect ? t.correct : t.wrong}
            {result.xpAwarded > 0 && (
              <span className="ml-2 text-sm text-amber-text">+{result.xpAwarded} XP</span>
            )}
          </div>
          <p className="text-sm">
            <Furigana text={result.feedbackTr} lang={cjkLang} />
          </p>
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
  if (!embedded) return <CenteredPage>{children}</CenteredPage>;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4 px-6 text-center min-h-[70dvh] py-10">
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
          className="h-2.5 w-2.5 animate-bounce rounded-full bg-indigo"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  );
}
