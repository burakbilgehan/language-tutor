"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStrings } from "@/lib/i18n/use-strings";
import { useLlmStatus } from "@/lib/llm-status";
import { grammarTopics, grammarGenerate, grammarGenerateBatch } from "@/lib/client-api";

interface TopicDto {
  slug: string;
  titleTr: string;
  category: string;
  level: string | null;
  status: "pending" | "generating" | "ready" | "error";
}

const STATUS_ICONS: Record<TopicDto["status"], string> = {
  ready: "📖",
  generating: "⏳",
  error: "⚠️",
  pending: "✨",
};

// Level labels are flat across schemes (JLPT/HSK/CEFR — level strings are
// globally unique). The visible level list itself is derived from the topics,
// so each language only ever shows its own scheme.
const S = {
  tr: {
    categories: {
      writing: "Yazı Sistemi",
      particles: "Edatlar",
      verbs: "Fiiller",
      adjectives: "Sıfatlar",
      nouns: "İsimler",
      numbers: "Sayılar",
      syntax: "Cümle Yapısı",
      honorifics: "Kibarlık",
      expressions: "İfadeler",
      conjugation: "Çekim Tabloları",
      classical: "Klasik Kalıntılar",
      register: "Dil Register'ı",
    } as Record<string, string>,
    statuses: {
      ready: "Hazır",
      generating: "Hazırlanıyor",
      error: "Hata — tekrar denenecek",
      pending: "Henüz hazırlanmadı",
    } as Record<TopicDto["status"], string>,
    levels: {
      N5: "N5 — Başlangıç",
      N4: "N4 — Temel",
      N3: "N3 — Orta",
      N2: "N2 — Orta-İleri",
      N1: "N1 — İleri",
      HSK1: "HSK 1 — Başlangıç",
      HSK2: "HSK 2 — Temel",
      HSK3: "HSK 3 — Orta Öncesi",
      HSK4: "HSK 4 — Orta",
      HSK5: "HSK 5 — Orta-İleri",
      HSK6: "HSK 6 — İleri",
      A1: "A1 — Başlangıç",
      A2: "A2 — Temel",
      B1: "B1 — Orta",
      B2: "B2 — Orta-İleri",
      C1: "C1 — İleri",
      C2: "C2 — Ustalık",
    } as Record<string, string>,
    loading: "Yükleniyor...",
    empty: "Müfredat oluşunca gramer konuları burada listelenecek.",
    all: "Hepsi",
    prepareCount: (n: number) => `${n} konuyu hazırla`,
    clickToGenerate: (status: string) => `${status} — üretmek için tıkla`,
    queueing: "Kuyruğa alınıyor...",
    prepareAllLevel: (level: string) => `${level} — Tümünü Hazırla`,
    prepareAll: "Tümünü Hazırla",
  },
  en: {
    categories: {
      writing: "Writing System",
      particles: "Particles",
      verbs: "Verbs",
      adjectives: "Adjectives",
      nouns: "Nouns",
      numbers: "Numbers",
      syntax: "Sentence Structure",
      honorifics: "Politeness",
      expressions: "Expressions",
      conjugation: "Conjugation Tables",
      classical: "Classical Remnants",
      register: "Language Register",
    } as Record<string, string>,
    statuses: {
      ready: "Ready",
      generating: "Generating",
      error: "Error — will retry",
      pending: "Not prepared yet",
    } as Record<TopicDto["status"], string>,
    levels: {
      N5: "N5 — Beginner",
      N4: "N4 — Elementary",
      N3: "N3 — Intermediate",
      N2: "N2 — Upper-Intermediate",
      N1: "N1 — Advanced",
      HSK1: "HSK 1 — Beginner",
      HSK2: "HSK 2 — Elementary",
      HSK3: "HSK 3 — Pre-Intermediate",
      HSK4: "HSK 4 — Intermediate",
      HSK5: "HSK 5 — Upper-Intermediate",
      HSK6: "HSK 6 — Advanced",
      A1: "A1 — Beginner",
      A2: "A2 — Elementary",
      B1: "B1 — Intermediate",
      B2: "B2 — Upper-Intermediate",
      C1: "C1 — Advanced",
      C2: "C2 — Mastery",
    } as Record<string, string>,
    loading: "Loading...",
    empty: "Grammar topics will be listed here once your curriculum is created.",
    all: "All",
    prepareCount: (n: number) => `Prepare ${n} topics`,
    clickToGenerate: (status: string) => `${status} — click to generate`,
    queueing: "Queuing...",
    prepareAllLevel: (level: string) => `${level} — Prepare All`,
    prepareAll: "Prepare All",
  },
};
// Category display order within a level.
const CATEGORY_ORDER = [
  "writing",
  "particles",
  "nouns",
  "numbers",
  "verbs",
  "adjectives",
  "syntax",
  "conjugation",
  "honorifics",
  "classical",
  "register",
  "expressions",
];

export function GrammarSidebar() {
  const s = useStrings(S);
  const llm = useLlmStatus();
  const activeSlug = useSearchParams().get("topic");

  const [topics, setTopics] = useState<TopicDto[] | null>(null);
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const d = await grammarTopics().catch(() => ({ topics: [] }));
    const list: TopicDto[] = d.topics ?? [];
    setTopics(list);
    if (list.some((t) => t.status === "generating")) {
      pollRef.current = setTimeout(load, 3000);
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [load]);

  const generateOne = async (e: React.MouseEvent, t: TopicDto) => {
    e.preventDefault();
    e.stopPropagation();
    if (!llm.configured) return; // LLM'siz: hazırlama tetiklenmez
    if (t.status === "ready" || t.status === "generating") return;
    setTopics((prev) =>
      prev
        ? prev.map((x) =>
            x.slug === t.slug ? { ...x, status: "generating" } : x
          )
        : prev
    );
    await grammarGenerate(t.slug).catch(() => {});
    if (pollRef.current) clearTimeout(pollRef.current);
    pollRef.current = setTimeout(load, 3000);
  };

  const generateAll = async (level?: string) => {
    setBatchBusy(true);
    try {
      await grammarGenerateBatch(level).catch(() => {});
      await load();
    } finally {
      setBatchBusy(false);
    }
  };

  if (!topics) {
    return (
      <div className="p-6 text-center text-sm text-ink-soft">{s.loading}</div>
    );
  }
  if (topics.length === 0) {
    return (
      <p className="p-6 text-center text-sm text-ink-soft">{s.empty}</p>
    );
  }

  // Group topics by level, then by category (respecting CATEGORY_ORDER).
  // Level order = order of first appearance: the API returns topics
  // position-ordered (level-major), so this follows the language's own
  // scheme (N5→N1, HSK1→6, A1→C2) without hardcoding any of them.
  const levelOrder: string[] = [];
  const byLevel = new Map<string, Map<string, TopicDto[]>>();
  for (const t of topics) {
    const lvl = t.level ?? "?";
    if (!byLevel.has(lvl)) levelOrder.push(lvl);
    const cats = byLevel.get(lvl) ?? new Map<string, TopicDto[]>();
    const list = cats.get(t.category) ?? [];
    list.push(t);
    cats.set(t.category, list);
    byLevel.set(lvl, cats);
  }
  const orderedCats = (cats: Map<string, TopicDto[]>) =>
    [...cats.entries()].sort(
      (a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0])
    );
  const visibleLevels = levelOrder.filter(
    (l) => !levelFilter || l === levelFilter
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setLevelFilter(null)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            levelFilter === null
              ? "bg-accent text-white"
              : "bg-surface text-ink-soft shadow-cozy hover:bg-surface-2"
          }`}
        >
          {s.all}
        </button>
        {levelOrder.map((l) => (
          <button
            key={l}
            onClick={() => setLevelFilter(l)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              levelFilter === l
                ? "bg-accent text-white"
                : "bg-surface text-ink-soft shadow-cozy hover:bg-surface-2"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {visibleLevels.map((lvl) => {
        const cats = byLevel.get(lvl)!;
        const all = [...cats.values()].flat();
        const readyCount = all.filter((t) => t.status === "ready").length;
        const pendingCount = all.filter(
          (t) => t.status === "pending" || t.status === "error"
        ).length;
        return (
          <details key={lvl} open>
            <summary className="mb-2 flex cursor-pointer flex-wrap items-center gap-2 font-bold text-ink">
              <span>{s.levels[lvl] ?? lvl}</span>
              <span className="text-xs font-normal text-ink-soft">
                {readyCount}/{all.length}
              </span>
              {pendingCount > 0 && llm.configured && (
                <button
                  disabled={batchBusy}
                  onClick={(e) => {
                    e.preventDefault();
                    generateAll(lvl);
                  }}
                  title={s.prepareCount(pendingCount)}
                  className="ml-auto rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-accent-soft disabled:opacity-40"
                >
                  {batchBusy ? "..." : `↓ ${pendingCount}`}
                </button>
              )}
            </summary>
            {orderedCats(cats).map(([cat, list]) => (
              <section key={cat} className="mb-3">
                <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
                  {s.categories[cat] ?? cat}
                </h3>
                <div className="flex flex-col gap-1">
                  {list.map((t) => (
                    <Link
                      key={t.slug}
                      href={`/grammar?topic=${encodeURIComponent(t.slug)}`}
                      className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                        activeSlug === t.slug
                          ? "bg-accent-soft font-semibold text-ink"
                          : "bg-surface text-ink hover:bg-surface-2"
                      }`}
                    >
                      <span className="min-w-0 truncate">{t.titleTr}</span>
                      <button
                        title={
                          t.status === "pending" || t.status === "error"
                            ? s.clickToGenerate(s.statuses[t.status])
                            : s.statuses[t.status]
                        }
                        onClick={(e) => generateOne(e, t)}
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs transition-colors ${
                          t.status === "pending" || t.status === "error"
                            ? "cursor-pointer hover:bg-accent-soft"
                            : "cursor-default"
                        }`}
                      >
                        {STATUS_ICONS[t.status]}
                      </button>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </details>
        );
      })}

      {topics.some((t) => t.status === "pending" || t.status === "error") &&
        llm.configured && (
        <button
          disabled={batchBusy}
          onClick={() => generateAll(levelFilter ?? undefined)}
          className="rounded-full bg-surface-2 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-accent-soft disabled:opacity-40"
        >
          {batchBusy
            ? s.queueing
            : levelFilter
              ? s.prepareAllLevel(levelFilter)
              : s.prepareAll}
        </button>
      )}
    </div>
  );
}
