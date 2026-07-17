"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useProfileMeta } from "@/lib/use-profile-meta";
import { useStrings } from "@/lib/i18n/use-strings";

const S = {
  tr: {
    nav: {
      lessons: "Dersler",
      grammar: "Gramer",
      kana: "Kana",
      stroke: "Yazım",
      conjugate: "Çekim",
      review: "Tekrar",
      chat: "Sohbet",
    },
    streak: "Seri",
    settings: "Ayarlar",
    costTitle: (today: string, calls: number, total: string) =>
      `Bugün: $${today} (${calls} çağrı) · Toplam: $${total}`,
  },
  en: {
    nav: {
      lessons: "Lessons",
      grammar: "Grammar",
      kana: "Kana",
      stroke: "Writing",
      conjugate: "Conjugate",
      review: "Review",
      chat: "Chat",
    },
    streak: "Streak",
    settings: "Settings",
    costTitle: (today: string, calls: number, total: string) =>
      `Today: $${today} (${calls} calls) · Total: $${total}`,
  },
};

interface LlmStats {
  todayUsd: number;
  totalUsd: number;
  todayCalls: number;
}

function CostBadge() {
  const t = useStrings(S);
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
      title={t.costTitle(
        stats.todayUsd.toFixed(2),
        stats.todayCalls,
        stats.totalUsd.toFixed(2)
      )}
    >
      💸 ${stats.todayUsd.toFixed(2)}
    </span>
  );
}

interface NavItem {
  href: string;
  label: keyof typeof S.tr.nav;
  /** Extra path prefixes that count as "this section is active". */
  match?: string[];
  /** Only shown for Japanese profiles (kana table, stroke practice). */
  jaOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/map", label: "lessons", match: ["/lesson", "/quest"] },
  { href: "/grammar", label: "grammar" },
  { href: "/kana", label: "kana", jaOnly: true },
  { href: "/stroke", label: "stroke", jaOnly: true },
  // ja: conjugator, zh: aspect chart, nl: conjugator — all languages covered.
  { href: "/conjugate", label: "conjugate" },
  { href: "/review", label: "review" },
  { href: "/chat", label: "chat" },
];

/**
 * The single site-wide navigation bar: page title + stats on the top row,
 * section tabs on the bottom row. Total height is fixed at var(--header-h)
 * (globals.css) — sticky elements below the header rely on it.
 */
export function StatsHeader({
  title,
  xpTotal,
  streak,
}: {
  title?: string;
  xpTotal?: number;
  streak?: { current: number };
}) {
  const pathname = usePathname();
  const t = useStrings(S);
  const lang = useProfileMeta()?.targetLanguage;
  const items = NAV_ITEMS.filter((i) => !i.jaOnly || lang === "ja");

  const isActive = (item: NavItem) =>
    [item.href, ...(item.match ?? [])].some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );

  return (
    <header className="sticky top-0 z-20 border-b border-surface-2 bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between gap-4">
          <h1 className="min-w-0 truncate font-display text-lg font-semibold">
            {title}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            {streak && (
              <span
                className="flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold shadow-cozy"
                title={t.streak}
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
            <Link
              href="/settings"
              title={t.settings}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                pathname.startsWith("/settings")
                  ? "bg-accent-soft"
                  : "hover:bg-surface-2"
              }`}
            >
              ⚙︎
            </Link>
          </div>
        </div>
        <nav className="flex h-11 items-center gap-1.5 overflow-x-auto">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-full px-4 py-1.5 text-[15px] font-medium transition-colors ${
                isActive(item)
                  ? "bg-accent text-surface shadow-cozy"
                  : "hover:bg-surface-2"
              }`}
            >
              {t.nav[item.label]}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
