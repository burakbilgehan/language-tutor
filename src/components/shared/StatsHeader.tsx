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
import { useTheme } from "@/lib/use-theme";

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
    themeToDark: "Koyu temaya geç",
    themeToLight: "Açık temaya geç",
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
    themeToDark: "Switch to dark theme",
    themeToLight: "Switch to light theme",
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
      className="hidden sm:flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-indigo shadow-cozy"
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
          className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber ring-2 ring-background"
        />
      )}
    </button>
  );
}

/** Single-symbol dark/light toggle; state shared with the settings switch
 * via useTheme. Shows the theme a click switches TO (☾ in light, ☀︎ in dark). */
function ThemeButton({
  titleToDark,
  titleToLight,
}: {
  titleToDark: string;
  titleToLight: string;
}) {
  const { dark, toggle } = useTheme();
  const title = dark ? titleToLight : titleToDark;
  return (
    <button
      type="button"
      onClick={toggle}
      title={title}
      aria-label={title}
      className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-surface text-base leading-none shadow-cozy transition-colors hover:bg-surface-2"
    >
      {dark ? "☀︎" : "☾"}
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

export interface NavItem {
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
  { href: "/vocab", label: "vocab", langs: ["zh"] },
  { href: "/pinyin", label: "pinyin", langs: ["zh"] },
  { href: "/stroke", label: "stroke", jaOnly: true },
  // ja: conjugator, zh: aspect chart, nl: conjugator — all languages covered.
  { href: "/conjugate", label: "conjugate" },
  { href: "/exam", label: "exam", langs: ["nl"] },
  { href: "/review", label: "review" },
  { href: "/chat", label: "chat" },
];

/** Nav items visible for a target language. Single source for the header tabs
 * AND the /map no-curriculum hub (T-056) — a new page added here reaches both. */
export function visibleNavItems(lang: string | undefined): NavItem[] {
  return NAV_ITEMS.filter(
    (i) =>
      (!i.jaOnly || lang === "ja") && (!i.langs || i.langs.includes(lang ?? ""))
  );
}

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
  const items = visibleNavItems(lang);

  const isActive = (item: NavItem) =>
    [item.href, ...(item.match ?? [])].some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );

  return (
    <header className="sticky top-0 z-20 border-b border-surface-2 bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <svg viewBox="0 0 128 86" height="28" aria-hidden="true">
              <g fill="var(--accent)">
                <circle cx="40" cy="44" r="22" />
                <circle cx="68" cy="34" r="27" />
                <circle cx="94" cy="47" r="18" />
                <rect x="18" y="44" width="94" height="22" rx="11" />
              </g>
              <rect x="30" y="74" width="26" height="7" rx="3.5" fill="var(--indigo)" />
              <rect x="64" y="74" width="42" height="7" rx="3.5" fill="var(--indigo)" />
            </svg>
            <h1 className="min-w-0 truncate font-display text-lg font-semibold">
              {title}
            </h1>
          </div>
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
              <span className="flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-amber-text shadow-cozy">
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
            <ThemeButton
              titleToDark={t.themeToDark}
              titleToLight={t.themeToLight}
            />
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
