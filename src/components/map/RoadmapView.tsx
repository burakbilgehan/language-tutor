"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { CenteredPage } from "@/components/shared/CenteredPage";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { useStrings } from "@/lib/i18n/use-strings";
import { useProfileMeta } from "@/lib/use-profile-meta";
import { languageLabel } from "@/lib/profile-options";
import { levelDisplay } from "@/lib/curriculum/levels";
import { roadmap, profileData, curriculumExtend } from "@/lib/client-api";
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
  },
};

interface NodeDto {
  id: string;
  lessonType: "lesson" | "checkpoint" | "boss";
  titleTr: string;
  subtitleTr: string;
  xpReward: number;
  status: "locked" | "available" | "completed";
}

interface RoadmapDto {
  curriculum: { id: string; title: string };
  levelScheme: string;
  finalLevel: string;
  units: {
    id: string;
    titleTr: string;
    descriptionTr: string;
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
  const meta = useProfileMeta();
  const [data, setData] = useState<RoadmapDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [extendJobId, setExtendJobId] = useState<string | null>(null);
  const [extendError, setExtendError] = useState<string | null>(null);
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);

  // Lessons open in a drawer over the map (scroll position survives). The
  // drawer state is mirrored into ?lesson=<id> so the browser back button
  // closes the drawer instead of leaving the page.
  const openLesson = useCallback((id: string) => {
    window.history.pushState(null, "", withBase(`/map?lesson=${id}`));
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
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : t.loadFailed));

  useEffect(() => {
    loadRoadmap();
    profileData()
      .then((d) => d?.profile?.id && setProfileId(d.profile.id))
      .catch(() => {});
  }, []);

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

  const startExtend = async () => {
    if (!profileId) return;
    setExtendError(null);
    try {
      const j = await curriculumExtend(profileId);
      setExtendJobId(j.jobId ?? null);
    } catch (e) {
      setExtendError(e instanceof Error ? e.message : t.startFailed);
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
            : data.curriculum.title
        }
        xpTotal={data.xpTotal}
        streak={data.streak}
      />

      {/* When a lesson is open the map column slides left: right padding
          reserves the panel's width, left padding the review bubble's rail.
          The DOM (and thus body scroll position) is untouched. */}
      <div
        className={`transition-[padding] duration-500 ease-in-out ${
          lessonOpen ? "sm:pl-20 sm:pr-[var(--panel-w)]" : ""
        }`}
      >
      <main className="mx-auto max-w-xl px-4">
        {data.units.map((unit, ui) => (
          <section key={unit.id} className="relative">
            <div className="sticky top-[calc(var(--header-h)+8px)] z-10 my-6 rounded-cozy bg-surface px-5 py-4 shadow-cozy">
              <div className="text-xs font-semibold uppercase tracking-wider text-accent">
                {t.unit(ui + 1)}
              </div>
              <h2 className="text-lg font-semibold">{unit.titleTr}</h2>
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
                    className="h-2 w-2 animate-bounce rounded-full bg-accent"
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
                <p className="text-xs text-red-500">{extendError}</p>
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
          accent ? "bg-moss-soft" : "bg-surface"
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
}: {
  node: NodeDto;
  offsetFactor: number;
  onClick: () => void;
}) {
  const locked = node.status === "locked";
  const completed = node.status === "completed";
  const available = node.status === "available";

  return (
    <button
      onClick={onClick}
      disabled={locked}
      style={{
        transform: `translateX(calc(${offsetFactor} * min(90px, 18vw)))`,
      }}
      className={`group relative z-[1] my-2 flex flex-col items-center cursor-pointer disabled:cursor-not-allowed`}
      title={node.subtitleTr}
    >
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl transition-all ${
          completed
            ? "bg-moss text-surface shadow-cozy"
            : available
              ? "bg-accent text-surface shadow-cozy animate-pulse-glow group-hover:scale-110"
              : "bg-locked text-surface"
        }`}
      >
        {locked ? "🔒" : completed ? "✓" : TYPE_ICON[node.lessonType]}
      </div>
      <div
        className={`mt-1.5 max-w-36 text-center text-xs font-semibold leading-tight ${
          locked ? "text-ink-soft/60" : "text-ink"
        }`}
      >
        {node.titleTr}
      </div>
      {!locked && !completed && (
        <div className="text-[10px] font-semibold text-gold">
          +{node.xpReward} XP
        </div>
      )}
    </button>
  );
}
