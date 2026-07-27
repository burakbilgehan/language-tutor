"use client";

import { useEffect, useState } from "react";
import { useStrings } from "@/lib/i18n/use-strings";
import {
  onJobsChange,
  cancelJobApi,
  cancelAllJobsApi,
  resumePendingJobsApi,
  IS_STATIC,
} from "@/lib/client-api";
import type { JobSummary, JobsSnapshot } from "@/core/jobs";

const S = {
  tr: {
    title: "İş Kuyruğu",
    desc: "Arka planda çalışan içerik üretimleri. Yanlışlıkla başlatılan bir batch'i buradan durdurabilirsin.",
    idle: "Şu an çalışan iş yok.",
    active: "Aktif",
    history: "Geçmiş",
    system: "sistem",
    user: "kullanıcı",
    cancel: "İptal",
    stopUser: "Kullanıcı işlerini durdur",
    stopAll: "Hepsini durdur (sistem dahil)",
    resume: (n: number) => `${n} iş bekliyor — devam et`,
    resumed: "Devam ettiriliyor…",
    staticNote:
      "Bu modda kuyruk sekmene bağlıdır; sekmeyi kapatırsan çalışan üretim durur.",
    status: {
      queued: "sırada",
      running: "çalışıyor",
      done: "bitti",
      error: "hata",
      cancelled: "iptal",
      pending_approval: "onay bekliyor",
    } as Record<string, string>,
    jobType: {
      lesson: "ders",
      chapter: "bölüm",
      curriculum: "müfredat",
      grammar: "gramer",
      kanji: "kanji",
      vocab: "sözlük",
      side_quest: "görev",
    } as Record<string, string>,
    none: "—",
  },
  en: {
    title: "Job Queue",
    desc: "Background content generations. If you started a batch by mistake, you can stop it here.",
    idle: "No jobs running right now.",
    active: "Active",
    history: "History",
    system: "system",
    user: "user",
    cancel: "Cancel",
    stopUser: "Stop user jobs",
    stopAll: "Stop all (incl. system)",
    resume: (n: number) => `${n} job${n === 1 ? "" : "s"} waiting — resume`,
    resumed: "Resuming…",
    staticNote:
      "In this mode the queue lives in your tab; closing the tab stops any running generation.",
    status: {
      queued: "queued",
      running: "running",
      done: "done",
      error: "error",
      cancelled: "cancelled",
      pending_approval: "awaiting approval",
    } as Record<string, string>,
    jobType: {
      lesson: "lesson",
      chapter: "chapter",
      curriculum: "curriculum",
      grammar: "grammar",
      kanji: "kanji",
      vocab: "vocabulary",
      side_quest: "quest",
    } as Record<string, string>,
    none: "—",
  },
};

function timeLabel(ms: number | null): string {
  if (!ms) return "";
  try {
    return new Date(ms).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function statusTone(status: string): string {
  switch (status) {
    case "running":
      return "text-accent";
    case "error":
      return "text-danger";
    case "done":
      return "text-moss";
    case "cancelled":
      return "text-ink-soft";
    case "pending_approval":
      return "text-gold";
    default:
      return "text-ink-soft";
  }
}

export function JobQueuePanel() {
  const t = useStrings(S);
  const [snap, setSnap] = useState<JobsSnapshot | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => onJobsChange(setSnap), []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const row = (j: JobSummary, historical: boolean) => (
    <div
      key={j.id}
      className="flex items-center gap-2 border-t border-surface-2 py-2 text-sm first:border-t-0"
    >
      <span className="w-20 shrink-0 font-medium">
        {t.jobType[j.jobType] ?? j.jobType}
      </span>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          j.kind === "user" ? "bg-accent-soft" : "bg-surface-2 text-ink-soft"
        }`}
      >
        {j.kind === "user" ? t.user : t.system}
      </span>
      <span
        className="min-w-0 flex-1 truncate text-xs text-ink-soft"
        title={j.refId}
      >
        {j.refId}
      </span>
      <span className={`shrink-0 text-xs font-semibold ${statusTone(j.status)}`}>
        {t.status[j.status] ?? j.status}
      </span>
      <span className="hidden w-12 shrink-0 text-right text-[11px] text-ink-soft sm:inline">
        {timeLabel(historical ? j.finishedAt : j.startedAt ?? j.createdAt) ||
          t.none}
      </span>
      {!historical &&
      (j.status === "queued" ||
        j.status === "running" ||
        j.status === "pending_approval") ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(() => cancelJobApi(j.id))}
          className="shrink-0 rounded-full px-2 py-0.5 text-xs text-danger transition-colors hover:bg-surface-2 disabled:opacity-60"
        >
          {t.cancel}
        </button>
      ) : (
        <span className="w-[46px] shrink-0" />
      )}
    </div>
  );

  return (
    <section
      id="jobs"
      className="scroll-mt-20 rounded-cozy bg-surface p-6 shadow-cozy"
    >
      <h2 className="mb-1 font-semibold">{t.title}</h2>
      <p className="mb-3 text-sm text-ink-soft">{t.desc}</p>

      {snap && snap.counts.pendingApproval > 0 && !IS_STATIC && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void run(resumePendingJobsApi)}
          className="mb-3 rounded-full bg-gold/20 px-4 py-1.5 text-sm font-semibold text-gold transition-colors hover:bg-gold/30 disabled:opacity-60"
        >
          {busy ? t.resumed : t.resume(snap.counts.pendingApproval)}
        </button>
      )}

      {!snap || snap.active.length === 0 ? (
        <p className="text-sm text-ink-soft">{t.idle}</p>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              {t.active}
            </h3>
            <div className="flex gap-2">
              {snap.counts.user > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => cancelAllJobsApi(false))}
                  className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold transition-colors hover:bg-accent-soft disabled:opacity-60"
                >
                  {t.stopUser}
                </button>
              )}
              {snap.counts.total > snap.counts.user && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => cancelAllJobsApi(true))}
                  className="rounded-full px-3 py-1 text-xs text-ink-soft transition-colors hover:bg-surface-2 disabled:opacity-60"
                >
                  {t.stopAll}
                </button>
              )}
            </div>
          </div>
          <div>{snap.active.map((j) => row(j, false))}</div>
        </>
      )}

      {snap && snap.history.length > 0 && (
        <div className="mt-4 border-t border-surface-2 pt-3">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            {t.history}
          </h3>
          <div>{snap.history.map((j) => row(j, true))}</div>
        </div>
      )}

      {IS_STATIC && (
        <p className="mt-3 text-xs text-ink-soft">{t.staticNote}</p>
      )}
    </section>
  );
}
