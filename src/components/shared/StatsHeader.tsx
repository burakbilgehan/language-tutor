"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface LlmStats {
  todayUsd: number;
  totalUsd: number;
  todayCalls: number;
}

function CostBadge() {
  const [stats, setStats] = useState<LlmStats | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setStats(d.llm))
      .catch(() => {});
  }, []);

  if (!stats || stats.totalUsd <= 0) return null;
  return (
    <span
      className="hidden sm:flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-moss shadow-cozy"
      title={`Bugün: $${stats.todayUsd.toFixed(2)} (${stats.todayCalls} çağrı) · Toplam: $${stats.totalUsd.toFixed(2)}`}
    >
      💸 ${stats.todayUsd.toFixed(2)}
    </span>
  );
}

export function StatsHeader({
  title,
  xpTotal,
  streak,
  backHref,
}: {
  title: string;
  xpTotal?: number;
  streak?: { current: number };
  backHref?: string;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-surface-2 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {backHref && (
            <Link
              href={backHref}
              className="rounded-full bg-surface-2 px-3 py-1.5 text-sm hover:bg-accent-soft transition-colors shrink-0"
            >
              ← Harita
            </Link>
          )}
          <h1 className="truncate text-lg font-semibold">{title}</h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {streak && (
            <span
              className="flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold shadow-cozy"
              title="Seri"
            >
              🔥 {streak.current}
            </span>
          )}
          {xpTotal !== undefined && (
            <span className="flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-gold shadow-cozy">
              ✦ {xpTotal} XP
            </span>
          )}
          <CostBadge />
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <Link href="/grammar" className="rounded-full px-3 py-1.5 hover:bg-surface-2 transition-colors">Gramer</Link>
            <Link href="/review" className="rounded-full px-3 py-1.5 hover:bg-surface-2 transition-colors">Tekrar</Link>
            <Link href="/chat" className="rounded-full px-3 py-1.5 hover:bg-surface-2 transition-colors">Sohbet</Link>
            <Link href="/settings" className="rounded-full px-3 py-1.5 hover:bg-surface-2 transition-colors" title="Ayarlar">⚙︎</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
