"use client";

import { useEffect, useState } from "react";
import { useStrings } from "@/lib/i18n/use-strings";

const S = {
  tr: {
    title: "Gidişat",
    open: "Gidişat panelini aç",
    progress: "İlerleme",
    level: "Seviye",
    pace: "Tempo",
    paceVal: (n: number) => `haftada ~${n} ders (son 14 gün)`,
    projection: "Projeksiyon",
    projVal: (w: number, next: string) =>
      `bu hızla ~${w} haftada ${next} seviyesine geçersin`,
    projNone: "Tempo verisi yok — birkaç ders bitir, projeksiyon burada belirir.",
    scores: "Son skorlar",
    scoresVal: (n: number, avg: number) => `son 14 günde ${n} deneme, ort. %${avg}`,
    scoresNone: "Son 14 günde puanlı deneme yok.",
    srs: "Tekrar sağlığı",
    srsVal: (due: number, total: number, leeches: number) =>
      `${due} kart vadesi geldi / ${total} kart` +
      (leeches > 0 ? ` · ${leeches} inatçı kart` : ""),
    struggles: "Zorlandıkların",
    loading: "Yükleniyor…",
  },
  en: {
    title: "Progress",
    open: "Open the progress panel",
    progress: "Progress",
    level: "Level",
    pace: "Pace",
    paceVal: (n: number) => `~${n} lessons/week (last 14 days)`,
    projection: "Projection",
    projVal: (w: number, next: string) =>
      `at this pace you reach ${next} in ~${w} weeks`,
    projNone: "No pace data yet — finish a few lessons and the projection appears.",
    scores: "Recent scores",
    scoresVal: (n: number, avg: number) => `${n} attempts in 14 days, avg ${avg}%`,
    scoresNone: "No scored attempts in the last 14 days.",
    srs: "Review health",
    srsVal: (due: number, total: number, leeches: number) =>
      `${due} cards due / ${total} total` +
      (leeches > 0 ? ` · ${leeches} leeches` : ""),
    struggles: "Struggling with",
    loading: "Loading…",
  },
};

interface Overview {
  nodes: { total: number; completed: number };
  currentLevel: { display: string; done: number; total: number } | null;
  nextLevel: string | null;
  pacePerWeek: number;
  weeksToLevel: number | null;
  attempts: { n: number; avgScore: number | null };
  srs: { total: number; due: number; leeches: number };
  struggles: string | null;
}

export function FloatingOverview() {
  const t = useStrings(S);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    if (!open || data) return;
    fetch("/api/overview")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => {});
  }, [open, data]);

  return (
    <>
      <button
        type="button"
        title={t.open}
        onClick={() => {
          setOpen((o) => !o);
          setData(null); // her açılışta taze veri
        }}
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-xl text-white shadow-cozy transition-transform hover:scale-105"
      >
        📈
      </button>
      {open && (
        <div className="fixed bottom-20 right-5 z-40 w-80 max-w-[calc(100vw-2.5rem)] rounded-cozy bg-surface p-4 text-sm shadow-cozy">
          <div className="mb-2 font-display text-base font-bold">{t.title}</div>
          {!data ? (
            <p className="text-ink-soft">{t.loading}</p>
          ) : (
            <div className="flex flex-col gap-2">
              <div>
                <div className="text-xs font-semibold tracking-wider text-accent">
                  {t.progress.toUpperCase()}
                </div>
                <div>
                  {data.nodes.completed}/{data.nodes.total}
                  {data.currentLevel && (
                    <span className="text-ink-soft">
                      {" "}
                      · {data.currentLevel.display}: {data.currentLevel.done}/
                      {data.currentLevel.total}
                    </span>
                  )}
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{
                      width: `${data.nodes.total ? Math.round((100 * data.nodes.completed) / data.nodes.total) : 0}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold tracking-wider text-accent">
                  {t.pace.toUpperCase()}
                </div>
                <div>{t.paceVal(data.pacePerWeek)}</div>
                <div className="text-ink-soft">
                  {data.weeksToLevel && data.nextLevel
                    ? t.projVal(data.weeksToLevel, data.nextLevel)
                    : t.projNone}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold tracking-wider text-accent">
                  {t.scores.toUpperCase()}
                </div>
                <div>
                  {data.attempts.n > 0 && data.attempts.avgScore !== null
                    ? t.scoresVal(data.attempts.n, data.attempts.avgScore)
                    : t.scoresNone}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold tracking-wider text-accent">
                  {t.srs.toUpperCase()}
                </div>
                <div>{t.srsVal(data.srs.due, data.srs.total, data.srs.leeches)}</div>
              </div>
              {data.struggles && (
                <div>
                  <div className="text-xs font-semibold tracking-wider text-accent">
                    {t.struggles.toUpperCase()}
                  </div>
                  <div className="text-ink-soft">{data.struggles}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
