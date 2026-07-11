"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatsHeader } from "@/components/shared/StatsHeader";

interface NodeDto {
  id: string;
  nodeType: "main" | "side_quest";
  sideQuestKind: string | null;
  lessonType: "lesson" | "checkpoint" | "boss";
  titleTr: string;
  subtitleTr: string;
  xpReward: number;
  status: "locked" | "available" | "completed";
}

interface RoadmapDto {
  curriculum: { id: string; title: string };
  units: {
    id: string;
    titleTr: string;
    descriptionTr: string;
    theme: string;
    level: string | null;
    nodes: NodeDto[];
  }[];
  sideQuests: NodeDto[];
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

const QUEST_ICON: Record<string, string> = {
  kana_drill: "あ",
  kanji: "漢",
  pop_quiz: "❓",
  vocab_review: "🔁",
};

const LEVEL_NAME: Record<string, string> = {
  N5: "N5", N4: "N4", N3: "N3", N2: "N2", N1: "N1",
};

export function RoadmapView() {
  const router = useRouter();
  const [data, setData] = useState<RoadmapDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [extendJobId, setExtendJobId] = useState<string | null>(null);
  const [extendError, setExtendError] = useState<string | null>(null);

  const loadRoadmap = () =>
    fetch("/api/roadmap")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Yüklenemedi");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));

  useEffect(() => {
    loadRoadmap();
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
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
      const r = await fetch("/api/curriculum/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Başlatılamadı");
      setExtendJobId(j.jobId);
    } catch (e) {
      setExtendError(e instanceof Error ? e.message : "Başlatılamadı");
    }
  };

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-center px-6">
        <div className="text-4xl">🍂</div>
        <p className="text-ink-soft">{error}</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-ink-soft">
        Harita yükleniyor...
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-32">
      <StatsHeader
        title={data.curriculum.title}
        xpTotal={data.xpTotal}
        streak={data.streak}
      />

      <main className="mx-auto max-w-xl px-4">
        {data.units.map((unit, ui) => (
          <section key={unit.id} className="relative">
            <div className="sticky top-16 z-10 my-6 rounded-cozy bg-surface px-5 py-4 shadow-cozy">
              <div className="text-xs font-semibold uppercase tracking-wider text-accent">
                Ünite {ui + 1}
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
                  offset={Math.sin((ui * 7 + ni) * 1.1) * 90}
                  onClick={() =>
                    node.status !== "locked" &&
                    router.push(`/lesson/${node.id}`)
                  }
                />
              ))}
            </div>
          </section>
        ))}

        {/* End-of-map: extend to the next JLPT level */}
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
                {LEVEL_NAME[data.isGenerating ?? ""] ?? "Sonraki seviye"}{" "}
                hazırlanıyor... Bu birkaç dakika sürebilir.
              </p>
            </div>
          ) : data.nextLevel ? (
            <>
              <div className="text-3xl">🗻</div>
              <p className="text-sm text-ink-soft">
                Bu seviyeyi bitirince{" "}
                <strong>{LEVEL_NAME[data.nextLevel]}</strong> otomatik açılır —
                ya da şimdi hazırlayabilirsin.
              </p>
              <button
                onClick={startExtend}
                disabled={!profileId}
                className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-surface shadow-cozy transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                Sonraki seviyeyi hazırla ({LEVEL_NAME[data.nextLevel]})
              </button>
              {extendError && (
                <p className="text-xs text-red-500">{extendError}</p>
              )}
            </>
          ) : (
            <>
              <div className="text-3xl">🎌</div>
              <p className="text-sm text-ink-soft">
                Tüm seviyeler (N1&apos;e kadar) tamamlandı. Sözlük + gramer
                artık senin.
              </p>
            </>
          )}
        </div>
      </main>

      {/* Side quest rail */}
      <div className="fixed bottom-0 inset-x-0 z-20 border-t border-surface-2 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center gap-2 overflow-x-auto px-4 py-3">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Yan görevler
          </span>
          {data.sideQuests.map((sq) => (
            <button
              key={sq.id}
              onClick={() => router.push(`/quest/${sq.id}`)}
              className="flex shrink-0 items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-sm font-medium transition-all hover:bg-accent-soft active:scale-95 cursor-pointer"
            >
              <span>{QUEST_ICON[sq.sideQuestKind ?? ""] ?? "✦"}</span>
              {sq.titleTr}
            </button>
          ))}
          <button
            onClick={() => router.push("/review")}
            className="flex shrink-0 items-center gap-2 rounded-full bg-moss-soft px-4 py-2 text-sm font-medium transition-all hover:brightness-105 active:scale-95 cursor-pointer"
          >
            🔁 Tekrar
          </button>
        </div>
      </div>
    </div>
  );
}

function NodeBubble({
  node,
  offset,
  onClick,
}: {
  node: NodeDto;
  offset: number;
  onClick: () => void;
}) {
  const locked = node.status === "locked";
  const completed = node.status === "completed";
  const available = node.status === "available";

  return (
    <button
      onClick={onClick}
      disabled={locked}
      style={{ transform: `translateX(${offset}px)` }}
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
