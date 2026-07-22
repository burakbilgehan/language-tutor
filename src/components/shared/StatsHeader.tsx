"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useProfileMeta } from "@/lib/use-profile-meta";
import { useStrings } from "@/lib/i18n/use-strings";
import { stats as stats$, saveExportApi } from "@/lib/client-api";
import { useShortcutLabel } from "@/components/shared/CommandPalette";
import { useLlmStatus } from "@/lib/llm-status";
import { useBackup } from "@/lib/backup/use-backup";

const S = {
  tr: {
    nav: {
      lessons: "Dersler",
      grammar: "Gramer",
      vocab: "Sözlük",
      kana: "Kana",
      stroke: "Yazım",
      conjugate: "Çekim",
      pinyin: "Pinyin",
      exam: "Sınav",
      review: "Tekrar",
      chat: "Sohbet",
    },
    streak: "Seri",
    settings: "Ayarlar",
    settingsUnconfigured: "Ayarlar — LLM yapılandırılmadı",
    search: "Ara",
    save: "Yedekle",
    saveTitle: "İlerlemeni indir / yedekle",
    saveNudge: "İlerlemeni yedeklemeyi unutma",
    costTitle: (today: string, calls: number, total: string) =>
      `Bugün: $${today} (${calls} çağrı) · Toplam: $${total}`,
  },
  en: {
    nav: {
      lessons: "Lessons",
      grammar: "Grammar",
      vocab: "Dictionary",
      kana: "Kana",
      stroke: "Writing",
      conjugate: "Conjugate",
      pinyin: "Pinyin",
      exam: "Exams",
      review: "Review",
      chat: "Chat",
    },
    streak: "Streak",
    settings: "Settings",
    settingsUnconfigured: "Settings — LLM not configured",
    search: "Search",
    save: "Back up",
    saveTitle: "Download / back up your progress",
    saveNudge: "Don't forget to back up your progress",
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
    stats$()
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

/** Header-level save/backup affordance (T-032): one tap downloads the save;
 * an attention dot appears when the "back up your progress" nudge is due. */
function SaveButton({
  label,
  title,
  nudgeTitle,
}: {
  label: string;
  title: string;
  nudgeTitle: string;
}) {
  const backup = useBackup();
  return (
    <button
      type="button"
      onClick={() => void saveExportApi()}
      title={backup.remind ? nudgeTitle : title}
      aria-label={backup.remind ? nudgeTitle : title}
      className="relative flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold shadow-cozy transition-colors hover:bg-surface-2"
    >
      <span className="text-base leading-none">⬇︎</span>
      <span className="hidden sm:inline">{label}</span>
      {backup.remind && (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-background"
        />
      )}
    </button>
  );
}

/** Global search trigger: opens the cmd+K palette, shows the shortcut. */
function SearchButton({ title }: { title: string }) {
  const shortcut = useShortcutLabel();
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("palette:open"))}
      title={title}
      aria-label={title}
      className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm shadow-cozy transition-colors hover:bg-surface-2"
    >
      🔍
      <kbd className="hidden font-sans text-xs text-ink-soft sm:inline">
        {shortcut}
      </kbd>
    </button>
  );
}

interface NavItem {
  href: string;
  label: keyof typeof S.tr.nav;
  /** Extra path prefixes that count as "this section is active". */
  match?: string[];
  /** Only shown for Japanese profiles (kana table, stroke practice). */
  jaOnly?: boolean;
  /** Only shown for these target languages (e.g. pinyin chart → zh). */
  langs?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/map", label: "lessons", match: ["/lesson"] },
  { href: "/grammar", label: "grammar" },
  // Word dictionary: index data exists for zh only (HSK word lists).
  { href: "/vocab", label: "vocab", langs: ["zh", "ja"] },
  { href: "/pinyin", label: "pinyin", langs: ["zh"] },
  { href: "/stroke", label: "stroke", jaOnly: true },
  // ja: conjugator, zh: aspect chart, nl: conjugator — all languages covered.
  { href: "/conjugate", label: "conjugate" },
  { href: "/exam", label: "exam", langs: ["nl"] },
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
  const llmStatus = useLlmStatus();
  const items = NAV_ITEMS.filter(
    (i) =>
      (!i.jaOnly || lang === "ja") && (!i.langs || i.langs.includes(lang ?? ""))
  );

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
            <SaveButton
              label={t.save}
              title={t.saveTitle}
              nudgeTitle={t.saveNudge}
            />
            <SearchButton title={t.search} />
            <Link
              href="/settings"
              title={llmStatus.configured ? t.settings : t.settingsUnconfigured}
              aria-label={llmStatus.configured ? t.settings : t.settingsUnconfigured}
              className={`relative flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold shadow-cozy transition-colors ${
                pathname.startsWith("/settings")
                  ? "bg-accent-soft"
                  : "bg-surface hover:bg-surface-2"
              }`}
            >
              <span className="text-base leading-none">⚙︎</span>
              <span className="hidden sm:inline">{t.settings}</span>
              {!llmStatus.configured && (
                <span
                  aria-hidden="true"
                  className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-background"
                />
              )}
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
