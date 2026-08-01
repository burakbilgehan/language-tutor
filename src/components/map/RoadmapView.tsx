"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { StatsHeader, visibleNavItems } from "@/components/shared/StatsHeader";
import { CenteredPage } from "@/components/shared/CenteredPage";
import { CozyButton } from "@/components/shared/CozyButton";
import { GeneratingScreen } from "@/components/onboarding/GeneratingScreen";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { useStrings } from "@/lib/i18n/use-strings";
import { useLocalizeError } from "@/lib/i18n/use-localize-error";
import { useProfileMeta } from "@/lib/use-profile-meta";
import { clearVisited } from "@/lib/visited-flag";
import { useLlmStatus } from "@/lib/llm-status";
import { languageLabel } from "@/lib/profile-options";
import { levelDisplay } from "@/lib/curriculum/levels";
import { AppError } from "@/lib/errors";
import {
  roadmap,
  profileData,
  curriculumExtend,
  curriculumGenerate,
  curriculumRetranslate,
  primeLessonWindow,
} from "@/lib/client-api";
import {
  subscribeLessonGen,
  lessonGenState,
  lessonGenVersion,
  type LessonGenState,
} from "@/lib/lesson-gen-store";
import { withBase } from "@/lib/base-path";

const S = {
  tr: {
    loadFailed: "Yüklenemedi",
    loading: "Harita yükleniyor...",
    startFailed: "Başlatılamadı",
    unit: (n: number) => `Ünite ${n}`,
    preparing: (lvl: string) =>
      `${lvl} hazırlanıyor... Bu birkaç dakika sürebilir.`,
    nextLevelFallback: "Sonraki seviye",
    nextAutoPre: "Bu seviyeyi bitirince ",
    nextAutoPost: " otomatik açılır — ya da şimdi hazırlayabilirsin.",
    prepareNext: (lvl: string) => `Sonraki seviyeyi hazırla (${lvl})`,
    allDone: (lvl: string) =>
      `Tüm seviyeler (${lvl}'e kadar) tamamlandı. Sözlük + gramer artık senin.`,
    review: "Tekrar",
    genPreparing: "Bu ders arkada hazırlanıyor",
    genFailed: "Ders hazırlanamadı; açıp tekrar deneyebilirsin",
    langMismatchTitle: "Müfredat başka bir dilde hazırlanmış",
    langMismatchBody:
      "Bu müfredatın başlıkları farklı bir dilde. İlerlemen korunur — yalnızca görünen başlıklar bu dile çevrilir.",
    retranslate: "Bu dile çevir",
    retranslating: "Çevriliyor...",
    hiddenTitle: "(bu dilde henüz yok)",
    noCurriculumTitle: "Kişisel haritan henüz çizilmedi",
    noCurriculumNoLlm:
      "Ders haritanı sana özel çizmem için bir yapay zekâ bağlantısı gerekiyor — Ayarlar'dan bağlayabilirsin. Acele yok: aşağıdaki kütüphane şimdiden açık.",
    noCurriculumLlm:
      "Yapay zekâ bağlantın hazır — kişisel müfredatını şimdi oluşturabilirsin. (Birkaç dakika sürebilir.)",
    generateNow: "Müfredatı oluştur",
    generating: "Hazırlanıyor...",
    goSettings: "⚙️ LLM bağla",
    hubHeading: "Bu arada kütüphane açık — bunlar tamamen hazır:",
    hubCards: {
      grammar: {
        icon: "📖",
        title: "Gramer",
        desc: "Seviye seviye tüm konular, örnekleriyle.",
      },
      vocab: {
        icon: "📚",
        title: "Sözlük",
        desc: "HSK kelime listeleri: pinyin, anlam, örnekler.",
      },
      pinyin: {
        icon: "🔤",
        title: "Pinyin",
        desc: "Ses ve ton tablosu.",
      },
      stroke: {
        icon: "✍️",
        title: "Yazım",
        desc: "Kanji çizim sırası pratiği.",
      },
      conjugate: {
        icon: "🔀",
        title: "Çekim",
        desc: "Fiil çekimleri ve kalıp tabloları.",
      },
      exam: {
        icon: "🎓",
        title: "Sınav",
        desc: "Sınav formatları ve kaynak rehberi.",
      },
    } as Record<string, { icon: string; title: string; desc: string }>,
  },
  en: {
    loadFailed: "Failed to load",
    loading: "Loading map...",
    startFailed: "Could not start",
    unit: (n: number) => `Unit ${n}`,
    preparing: (lvl: string) =>
      `Preparing ${lvl}... This can take a few minutes.`,
    nextLevelFallback: "The next level",
    nextAutoPre: "Finish this level and ",
    nextAutoPost: " unlocks automatically — or you can prepare it now.",
    prepareNext: (lvl: string) => `Prepare the next level (${lvl})`,
    allDone: (lvl: string) =>
      `All levels (up to ${lvl}) completed. The dictionary + grammar are yours now.`,
    review: "Review",
    genPreparing: "This lesson is being prepared in the background",
    genFailed: "The lesson could not be prepared; open it to try again",
    langMismatchTitle: "Curriculum is in another language",
    langMismatchBody:
      "This curriculum's titles are in a different language. Your progress is kept — only the visible titles are translated into this language.",
    retranslate: "Translate to this language",
    retranslating: "Translating...",
    hiddenTitle: "(not in this language yet)",
    noCurriculumTitle: "Your personal map isn't drawn yet",
    noCurriculumNoLlm:
      "Drawing a lesson map made just for you needs an AI connection — you can set one up in Settings. No rush: the library below is already open.",
    noCurriculumLlm:
      "Your AI connection is ready — you can generate your personal curriculum now. (This can take a few minutes.)",
    generateNow: "Generate curriculum",
    generating: "Preparing...",
    goSettings: "⚙️ Connect an LLM",
    hubHeading: "Meanwhile the library is open — these are fully ready:",
    hubCards: {
      grammar: {
        icon: "📖",
        title: "Grammar",
        desc: "Every topic, level by level, with examples.",
      },
      vocab: {
        icon: "📚",
        title: "Dictionary",
        desc: "HSK word lists: pinyin, meanings, examples.",
      },
      pinyin: {
        icon: "🔤",
        title: "Pinyin",
        desc: "Sound and tone chart.",
      },
      stroke: {
        icon: "✍️",
        title: "Writing",
        desc: "Kanji stroke-order practice.",
      },
      conjugate: {
        icon: "🔀",
        title: "Conjugate",
        desc: "Verb conjugations and pattern tables.",
      },
      exam: {
        icon: "🎓",
        title: "Exams",
        desc: "Exam formats and resource guide.",
      },
    } as Record<string, { icon: string; title: string; desc: string }>,
  },
};

interface NodeDto {
  id: string;
  lessonType: "lesson" | "checkpoint" | "boss";
  // null when the curriculum is in another native language (T-031): the server
  // suppresses the wrong-language text; the mismatch banner explains why.
  titleTr: string | null;
  subtitleTr: string | null;
  xpReward: number;
  status: "locked" | "available" | "completed";
  /** Ders satırının kalıcı üretim statüsü; "error" = üretim başarısız ve
   * kullanıcı retry'ı bekleniyor. Reload sonrası bellek-içi store boş
   * olduğundan hata rozeti bunsuz görünmezdi. */
  lessonStatus?: string | null;
}

interface RoadmapDto {
  curriculum: { id: string; title: string | null };
  contentLangMismatch: boolean;
  levelScheme: string;
  finalLevel: string;
  units: {
    id: string;
    titleTr: string | null;
    descriptionTr: string | null;
    theme: string;
    level: string | null;
    nodes: NodeDto[];
  }[];
  chapters: { level: string; status: string }[];
  topLevel: string | null;
  nextLevel: string | null;
  isGenerating: string | null;
  xpTotal: number;
  streak: { current: number; longest: number };
  dueCards?: number;
}

const TYPE_ICON: Record<string, string> = {
  lesson: "📖",
  checkpoint: "🏮",
  boss: "⛩️",
};

export function RoadmapView() {
  const router = useRouter();
  const t = useStrings(S);
  const localize = useLocalizeError();
  const meta = useProfileMeta();
  const [data, setData] = useState<RoadmapDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [extendJobId, setExtendJobId] = useState<string | null>(null);
  const [extendError, setExtendError] = useState<string | null>(null);
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);
  // T-056: profil var ama müfredat yok (LLM'siz onboarding). Kör boş harita
  // yerine açık bir durum: LLM yoksa statik kütüphaneye yönlendir, varsa
  // (sonradan bağlandıysa) üretimi buradan başlat.
  const llm = useLlmStatus();
  const [notReady, setNotReady] = useState(false);
  const [genJobId, setGenJobId] = useState<string | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Lessons open in a drawer over the map (scroll position survives). The
  // drawer state is mirrored into ?lesson=<id> so the browser back button
  // closes the drawer instead of leaving the page.
  const openLesson = useCallback((id: string) => {
    const url = withBase(`/map?lesson=${id}`);
    // Drawer zaten açıkken başka derse tıklanırsa history'ye YENİ kayıt
    // eklenmez, mevcut kayıt değiştirilir. Aksi halde her tıklama bir kayıt
    // yığar; "Kapat" (history.back) haritaya dönmek yerine önceki dersleri
    // tek tek geri açar ve kullanıcı kaç ders gezdiyse o kadar kapatmak
    // zorunda kalır. Böylece back/Kapat her zaman tek adımda haritaya döner.
    if (new URLSearchParams(window.location.search).has("lesson")) {
      window.history.replaceState(null, "", url);
    } else {
      window.history.pushState(null, "", url);
    }
    setOpenLessonId(id);
  }, []);
  const closeLesson = useCallback(() => {
    if (new URLSearchParams(window.location.search).has("lesson")) {
      window.history.back();
    } else {
      setOpenLessonId(null);
    }
  }, []);
  useEffect(() => {
    const sync = () =>
      setOpenLessonId(
        new URLSearchParams(window.location.search).get("lesson")
      );
    sync(); // deep link: /map?lesson=<id>
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  // Keep the LessonPlayer mounted during the slide-out animation.
  const [renderedLessonId, setRenderedLessonId] = useState<string | null>(
    null
  );
  useEffect(() => {
    if (openLessonId) {
      setRenderedLessonId(openLessonId);
      return;
    }
    const t = setTimeout(() => setRenderedLessonId(null), 500);
    return () => clearTimeout(t);
  }, [openLessonId]);

  // The map renders empty while /api/roadmap loads, so the browser lands at
  // scroll 0 on every visit. Persist the position and restore it once the
  // first data arrives.
  useEffect(() => {
    const onScroll = () =>
      sessionStorage.setItem("map-scroll", String(window.scrollY));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!data) return;
    const saved = sessionStorage.getItem("map-scroll");
    if (saved) window.scrollTo(0, Number(saved));
    // only on the null→loaded transition, not on every poll refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data == null]);

  const loadRoadmap = () =>
    roadmap()
      .then((d) => {
        setData(d);
        setNotReady(false);
        setError(null);
      })
      .catch((e) => {
        if (e instanceof AppError && e.code === "curriculum_not_ready") {
          setNotReady(true);
        } else {
          // T-054: profil YOK ama landing bayrağı duruyorsa bayrak bayat
          // (kullanıcı IndexedDB'yi temizledi, ya da tarayıcı depolamayı
          // tahliye etti). Bayrağı temizle: yoksa `/` her seferinde buraya
          // geri fırlatır ve kullanıcı tek yönlü kapana kısılır — landing'e
          // dönüp "yeni başla"ya basamaz.
          if (e instanceof AppError && e.code === "profile_missing") {
            clearVisited();
          }
          setError(localize(e));
        }
      });

  useEffect(() => {
    loadRoadmap();
    profileData()
      .then((d) => d?.profile?.id && setProfileId(d.profile.id))
      .catch(() => {});
    // T-068 üçüncü tetik: harita açılışında pencereyi frontier'dan bir kez
    // doldur. Pencere doluysa sıfır çağrı ("revisit'te çekme" korunur);
    // statikte sekme kapanınca ölen üretimi de bu toparlar.
    void primeLessonWindow();
  }, []);

  // T-070-B: üretim durumu modül-level store'da yaşıyor (bileşen ömründen
  // bağımsız). Harita ona abone olur, böylece drawer kapalıyken biten hata
  // düğümün üstünde rozet olarak GÖRÜNÜR.
  useSyncExternalStore(
    subscribeLessonGen,
    () => lessonGenVersion(),
    () => 0
  );

  // Poll while a chapter is generating (either auto-triggered or manual).
  const generating = extendJobId != null || data?.isGenerating != null;
  useEffect(() => {
    if (!generating) return;
    const t = setInterval(() => {
      loadRoadmap().then(() => {
        // stop the local job spinner once the server no longer reports it
      });
    }, 4000);
    return () => clearInterval(t);
  }, [generating]);

  // Clear the local job id once the server confirms generation finished.
  useEffect(() => {
    if (extendJobId && data && data.isGenerating == null) setExtendJobId(null);
  }, [data, extendJobId]);

  // T-056: while there is no curriculum, keep polling. Covers the "refreshed
  // mid-generation" case (a background chapter job finishes → the map appears
  // by itself) at the cost of one cheap not-ready read per 4s.
  useEffect(() => {
    if (!notReady) return;
    const t = setInterval(() => {
      void loadRoadmap();
    }, 4000);
    return () => clearInterval(t);
    // loadRoadmap is stable enough (recreated per render but side-effect-idempotent)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notReady]);

  // T-056: generate the first chapter from the map — the recovery path for a
  // profile that finished onboarding without an LLM and connected one later.
  // Server mode returns a jobId (GeneratingScreen polls it); static mode runs
  // inline and resolves when the chapter is ready.
  const startGenerate = async () => {
    if (!profileId) return;
    setGenBusy(true);
    setGenError(null);
    try {
      const r = await curriculumGenerate(profileId);
      if (r.jobId) {
        setGenJobId(r.jobId);
        return; // GeneratingScreen takes over; busy state no longer renders
      }
      await loadRoadmap(); // static inline: chapter is ready (or notReady stays)
    } catch (e) {
      setGenError(localize(e));
    } finally {
      setGenBusy(false);
    }
  };

  const startExtend = async () => {
    if (!profileId) return;
    setExtendError(null);
    try {
      const j = await curriculumExtend(profileId);
      setExtendJobId(j.jobId ?? null);
    } catch (e) {
      setExtendError(localize(e));
    }
  };

  const [retranslating, setRetranslating] = useState(false);
  const startRetranslate = async () => {
    setRetranslating(true);
    setExtendError(null);
    try {
      await curriculumRetranslate();
      await loadRoadmap();
    } catch (e) {
      setExtendError(localize(e));
    } finally {
      setRetranslating(false);
    }
  };

  if (error) {
    return (
      <CenteredPage>
        <div className="text-4xl">🍂</div>
        <p className="text-ink-soft">{error}</p>
      </CenteredPage>
    );
  }
  // T-056: a map-started server generation — reuse the onboarding screen
  // (status lines + job polling + error/retry) instead of a bare spinner.
  if (genJobId) {
    return (
      <GeneratingScreen
        jobId={genJobId}
        uiLanguage={meta?.uiLanguage}
        onDone={() => {
          setGenJobId(null);
          void loadRoadmap();
        }}
        onRetry={() => setGenJobId(null)}
      />
    );
  }
  // T-056: no curriculum yet. Never a blind empty map — the hub: an honest
  // status card (generate when an LLM exists, "connect one" otherwise) over
  // the language-aware static library, which is instantly usable.
  if (notReady) {
    const cards = visibleNavItems(meta?.targetLanguage).filter(
      // Not in the hub: lessons (this page), review (a fresh LLM-less profile
      // has no SRS cards yet), chat (LLM-gated surface).
      (i) => !["/map", "/review", "/chat"].includes(i.href)
    );
    return (
      <div className="min-h-dvh pb-16">
        <StatsHeader
          title={
            meta
              ? languageLabel(meta.targetLanguage, meta.uiLanguage)
              : undefined
          }
        />
        <main className="mx-auto max-w-xl px-4">
          <section className="mt-10 rounded-cozy bg-surface p-6 text-center shadow-cozy">
            <div className="text-4xl">🗺️</div>
            <h2 className="mt-2 text-xl font-semibold">
              {t.noCurriculumTitle}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
              {llm.configured ? t.noCurriculumLlm : t.noCurriculumNoLlm}
            </p>
            <div className="mt-4 flex justify-center">
              {llm.configured ? (
                <CozyButton
                  onClick={() => void startGenerate()}
                  disabled={genBusy || !profileId}
                >
                  {genBusy ? t.generating : t.generateNow}
                </CozyButton>
              ) : (
                <CozyButton
                  variant="soft"
                  onClick={() => router.push("/settings")}
                >
                  {t.goSettings}
                </CozyButton>
              )}
            </div>
            {genError && (
              <p className="mt-3 text-sm text-danger">{genError}</p>
            )}
          </section>

          <section className="mt-8">
            <p className="mb-3 text-sm font-semibold text-ink-soft">
              {t.hubHeading}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {cards.map((c) => {
                const card = t.hubCards[c.label];
                if (!card) return null;
                return (
                  <button
                    key={c.href}
                    onClick={() => router.push(c.href)}
                    className="cursor-pointer rounded-xl border-2 border-surface-2 bg-surface p-4 text-left transition-colors hover:border-indigo"
                  >
                    <div className="text-2xl">{card.icon}</div>
                    <div className="mt-1 font-semibold">{card.title}</div>
                    <p className="mt-0.5 text-sm text-ink-soft">{card.desc}</p>
                  </button>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    );
  }
  if (!data) {
    return (
      <CenteredPage>
        <p className="text-ink-soft">{t.loading}</p>
      </CenteredPage>
    );
  }

  const lessonOpen = openLessonId != null;

  return (
    <div
      className="min-h-dvh pb-32"
      style={{ ["--panel-w" as string]: "clamp(28rem, 64vw, 72rem)" }}
    >
      <StatsHeader
        // Deterministic title: language + highest generated level. The stored
        // curriculum.title is a one-shot LLM slogan that goes stale as soon as
        // the map extends past its original level.
        title={
          meta && data.topLevel
            ? `${languageLabel(meta.targetLanguage, meta.uiLanguage)} · ${levelDisplay(meta.targetLanguage, data.topLevel)}`
            : (data.curriculum.title ?? "")
        }
        xpTotal={data.xpTotal}
        streak={data.streak}
      />

      {/* When a lesson is open the map column slides left to clear the panel
          (plus the review rail's width). Transform, NOT padding: a padding
          transition relayouts the whole map on every animation frame, which
          is what made the drawer open at a crawl. Same visual shift: the
          column is centered, so translating by half the reserved width lands
          where the padding version did. Layout (and body scroll) untouched. */}
      <div
        className={`transition-transform duration-500 ease-in-out ${
          lessonOpen ? "sm:translate-x-[calc((5rem-var(--panel-w))/2)]" : ""
        }`}
      >
      <main className="mx-auto max-w-xl px-4">
        {data.contentLangMismatch && (
          <div className="my-6 rounded-cozy border border-accent/30 bg-surface px-5 py-4 shadow-cozy">
            <div className="font-semibold">{t.langMismatchTitle}</div>
            <p className="mt-1 text-sm text-ink-soft">{t.langMismatchBody}</p>
            <button
              onClick={startRetranslate}
              disabled={retranslating}
              className="mt-3 rounded-cozy bg-accent px-4 py-2 text-sm font-semibold text-surface disabled:opacity-60"
            >
              {retranslating ? t.retranslating : t.retranslate}
            </button>
          </div>
        )}
        {data.units.map((unit, ui) => (
          <section key={unit.id} className="relative">
            <div className="sticky top-[calc(var(--header-h)+8px)] z-10 my-6 rounded-cozy bg-surface px-5 py-4 shadow-cozy">
              <div className="text-xs font-semibold uppercase tracking-wider text-accent">
                {t.unit(ui + 1)}
              </div>
              <h2 className="text-lg font-semibold">
                {unit.titleTr ?? t.hiddenTitle}
              </h2>
              <p className="text-sm text-ink-soft">{unit.descriptionTr}</p>
            </div>

            <div className="relative flex flex-col items-center gap-2 py-2">
              {/* winding dotted spine */}
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 border-l-2 border-dashed border-surface-2" />
              {unit.nodes.map((node, ni) => (
                <NodeBubble
                  key={node.id}
                  node={node}
                  offsetFactor={Math.sin((ui * 7 + ni) * 1.1)}
                  onClick={() =>
                    node.status !== "locked" && openLesson(node.id)
                  }
                  genState={lessonGenState(node.id)}
                  genLabels={{
                    preparing: t.genPreparing,
                    failed: t.genFailed,
                  }}
                />
              ))}
            </div>
          </section>
        ))}

        {/* End-of-map: extend to the next level of the language's scheme */}
        <div className="my-10 flex flex-col items-center gap-3 text-center">
          {data.isGenerating || extendJobId ? (
            <div className="flex flex-col items-center gap-2 rounded-cozy bg-surface px-6 py-5 shadow-cozy">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 animate-bounce rounded-full bg-indigo"
                    style={{ animationDelay: `${i * 0.18}s` }}
                  />
                ))}
              </div>
              <p className="text-sm text-ink-soft">
                {t.preparing(data.isGenerating ?? t.nextLevelFallback)}
              </p>
            </div>
          ) : data.nextLevel ? (
            <>
              <div className="text-3xl">🗻</div>
              <p className="text-sm text-ink-soft">
                {t.nextAutoPre}
                <strong>{data.nextLevel}</strong>
                {t.nextAutoPost}
              </p>
              <button
                onClick={startExtend}
                disabled={!profileId}
                className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-surface shadow-cozy transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {t.prepareNext(data.nextLevel)}
              </button>
              {extendError && (
                <p className="text-xs text-danger">{extendError}</p>
              )}
            </>
          ) : (
            <>
              <div className="text-3xl">🎌</div>
              <p className="text-sm text-ink-soft">{t.allDone(data.finalLevel)}</p>
            </>
          )}
        </div>
      </main>
      </div>

      {/* Review shortcut: rail pinned to the left edge — always on screen
          while the curriculum scrolls underneath. Label is visible on wide
          screens and collapses to a hover-tooltip while a lesson is open. */}
      <div className="fixed left-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-start gap-2.5 sm:left-5">
        <RailBubble
          icon="🔁"
          label={`${t.review}${data.dueCards ? ` (${data.dueCards})` : ""}`}
          accent
          compact={lessonOpen}
          onClick={() => router.push("/review")}
        />
      </div>

      {/* Lesson panel: slides in from the right, map stays visible (and
          scrollable) on the left. */}
      <div
        className={`fixed inset-y-0 right-0 z-30 w-full overflow-y-auto overscroll-contain bg-background shadow-cozy transition-transform duration-500 ease-in-out sm:w-[var(--panel-w)] sm:rounded-l-3xl sm:border-l sm:border-surface-2 ${
          lessonOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {renderedLessonId && (
          <LessonPlayer
            key={renderedLessonId}
            nodeId={renderedLessonId}
            embedded
            onExit={closeLesson}
            onCompleted={loadRoadmap}
          />
        )}
      </div>
    </div>
  );
}

function RailBubble({
  icon,
  label,
  accent = false,
  compact = false,
  onClick,
}: {
  icon: string;
  label: string;
  accent?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="group relative flex items-center gap-2 cursor-pointer"
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl shadow-cozy transition-all group-hover:scale-110 active:scale-95 ${
          accent ? "bg-indigo-soft" : "bg-surface"
        }`}
      >
        {icon}
      </span>
      <span
        className={
          compact
            ? "pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-full bg-ink px-3 py-1 text-xs font-medium text-background group-hover:block"
            : "hidden max-w-40 truncate rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-cozy lg:block"
        }
      >
        {label}
      </span>
    </button>
  );
}

function NodeBubble({
  node,
  offsetFactor,
  onClick,
  genState,
  genLabels,
}: {
  node: NodeDto;
  offsetFactor: number;
  onClick: () => void;
  /** T-070-B: bu node için arka planda süren/biten üretimin durumu. Drawer
   * kapalıyken biten hata haritada BURADA görünür; eskiden hiçbir yüzeye
   * çıkmıyordu. */
  genState: LessonGenState | null;
  genLabels: { preparing: string; failed: string };
}) {
  const locked = node.status === "locked";
  const completed = node.status === "completed";
  const available = node.status === "available";
  const generating = genState?.kind === "running";
  // Kalıcı error (DB satırı) da rozet olur: reload sonrası store boşken tek
  // hakikat kaynağı o. Store'da canlı bir üretim varsa o kazanır (retry
  // sürerken "başarısız" gösterme).
  const genFailed =
    !generating &&
    (genState?.kind === "error" || node.lessonStatus === "error");

  return (
    <button
      onClick={onClick}
      disabled={locked}
      style={{
        transform: `translateX(calc(${offsetFactor} * min(90px, 18vw)))`,
      }}
      className={`group relative z-[1] my-2 flex flex-col items-center cursor-pointer disabled:cursor-not-allowed`}
      title={node.subtitleTr ?? undefined}
    >
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl transition-all ${
          completed
            ? "bg-indigo text-surface shadow-cozy"
            : available
              ? "bg-accent text-surface shadow-cozy animate-pulse-glow group-hover:scale-110"
              : "bg-locked text-surface"
        }`}
      >
        {locked ? "🔒" : completed ? "✓" : TYPE_ICON[node.lessonType]}
      </div>
      {/* Üretim rozeti: hazırlanıyor (indigo = durum) / başarısız (vermilion
          = eylem gerektiriyor, tıklayınca "tekrar dene" ekranı açılır). */}
      {!completed && (generating || genFailed) && (
        <span
          title={genFailed ? genLabels.failed : genLabels.preparing}
          className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] leading-none shadow-cozy ${
            genFailed ? "bg-accent text-surface" : "bg-indigo text-surface"
          }`}
        >
          {genFailed ? "!" : "⋯"}
        </span>
      )}
      <div
        className={`mt-1.5 max-w-36 text-center text-xs font-semibold leading-tight ${
          locked ? "text-ink-soft/60" : "text-ink"
        }`}
      >
        {node.titleTr}
      </div>
      {!locked && !completed && (
        <div className="text-[10px] font-semibold text-amber-text">
          +{node.xpReward} XP
        </div>
      )}
    </button>
  );
}
