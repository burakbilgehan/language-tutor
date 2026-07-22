"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStrings } from "@/lib/i18n/use-strings";
import { onJobsChange, cancelAllJobsApi } from "@/lib/client-api";
import type { JobsSnapshot } from "@/core/jobs";

const S = {
  tr: {
    active: (n: number) => `${n} iş çalışıyor`,
    pending: (n: number) => `${n} iş bekliyor`,
    stopAll: "Hepsini durdur",
    stopping: "Durduruluyor…",
    details: "Ayrıntılar",
    open: "Kuyruk durumu",
  },
  en: {
    active: (n: number) => `${n} job${n === 1 ? "" : "s"} running`,
    pending: (n: number) => `${n} job${n === 1 ? "" : "s"} waiting`,
    stopAll: "Stop all",
    stopping: "Stopping…",
    details: "Details",
    open: "Queue status",
  },
};

/**
 * Global bottom-right queue awareness pop (T-034). Sits directly above the
 * FloatingOverview button (which anchors bottom-right), visible on every page.
 * Hidden entirely when the queue is idle. Shows the total active count (system
 * + user, per T-034 item 11); "stop all" is offered only when a USER batch is
 * running (system-only prefetch/auto-extend shouldn't be cancellable from
 * here, or node opens slow down and the complaint comes back). The seam
 * (onJobsChange) hides the server-poll vs static-subscribe split.
 */
export function JobQueuePop() {
  const t = useStrings(S);
  const [snap, setSnap] = useState<JobsSnapshot | null>(null);
  const [stopping, setStopping] = useState(false);

  useEffect(() => onJobsChange(setSnap), []);

  if (!snap) return null;
  const { counts } = snap;
  if (counts.total === 0 && counts.pendingApproval === 0) return null;

  const running = counts.total - counts.pendingApproval;
  const stopAll = async () => {
    setStopping(true);
    try {
      await cancelAllJobsApi(false);
    } finally {
      setStopping(false);
    }
  };

  return (
    <div className="fixed bottom-36 right-5 z-40 w-64 max-w-[calc(100vw-2.5rem)] rounded-cozy bg-surface p-3 text-sm shadow-cozy">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent" />
        <span className="min-w-0 flex-1 font-semibold">
          {running > 0 ? t.active(running) : t.pending(counts.pendingApproval)}
        </span>
      </div>
      {counts.pendingApproval > 0 && running > 0 && (
        <div className="mt-1 text-xs text-ink-soft">
          {t.pending(counts.pendingApproval)}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        {counts.user > 0 && (
          <button
            type="button"
            onClick={stopAll}
            disabled={stopping}
            className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold transition-colors hover:bg-accent-soft disabled:opacity-60"
          >
            {stopping ? t.stopping : t.stopAll}
          </button>
        )}
        <Link
          href="/settings#jobs"
          className="rounded-full px-2 py-1 text-xs text-ink-soft transition-colors hover:bg-surface-2"
        >
          {t.details}
        </Link>
      </div>
    </div>
  );
}
