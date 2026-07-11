"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatsHeader } from "@/components/shared/StatsHeader";

interface TopicDto {
  slug: string;
  titleTr: string;
  category: string;
  level: string | null;
  status: "pending" | "generating" | "ready" | "error";
}

const CATEGORY_LABELS: Record<string, string> = {
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
};

const LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
const LEVEL_LABELS: Record<string, string> = {
  N5: "N5 — Başlangıç",
  N4: "N4 — Temel",
  N3: "N3 — Orta",
  N2: "N2 — Orta-İleri",
  N1: "N1 — İleri",
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

export default function GrammarIndexPage() {
  const [topics, setTopics] = useState<TopicDto[] | null>(null);
  const [levelFilter, setLevelFilter] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/grammar")
      .then((r) => r.json())
      .then((d) => setTopics(d.topics ?? []));
  }, []);

  if (!topics) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-ink-soft">
        Yükleniyor...
      </div>
    );
  }

  // Group topics by level, then by category (respecting CATEGORY_ORDER).
  const byLevel = new Map<string, Map<string, TopicDto[]>>();
  for (const t of topics) {
    const lvl = t.level ?? "N5";
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
  const visibleLevels = LEVELS.filter(
    (l) => byLevel.has(l) && (!levelFilter || l === levelFilter)
  );

  return (
    <div className="min-h-dvh pb-16">
      <StatsHeader title="Gramer Kütüphanesi" backHref="/map" />
      <main className="mx-auto max-w-2xl px-4 py-8">
        {topics.length === 0 && (
          <p className="text-center text-ink-soft">
            Müfredat oluşunca gramer konuları burada listelenecek.
          </p>
        )}

        {topics.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            <button
              onClick={() => setLevelFilter(null)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                levelFilter === null
                  ? "bg-accent text-white"
                  : "bg-surface text-ink-soft shadow-cozy hover:bg-surface-2"
              }`}
            >
              Hepsi
            </button>
            {LEVELS.filter((l) => byLevel.has(l)).map((l) => (
              <button
                key={l}
                onClick={() => setLevelFilter(l)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  levelFilter === l
                    ? "bg-accent text-white"
                    : "bg-surface text-ink-soft shadow-cozy hover:bg-surface-2"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        )}

        {visibleLevels.map((lvl) => {
          const cats = byLevel.get(lvl)!;
          return (
            <details key={lvl} open className="mb-6">
              <summary className="mb-4 cursor-pointer text-lg font-bold text-ink">
                {LEVEL_LABELS[lvl] ?? lvl}
              </summary>
              {orderedCats(cats).map(([cat, list]) => (
                <section key={cat} className="mb-6">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">
                    {CATEGORY_LABELS[cat] ?? cat}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {list.map((t) => (
                      <Link
                        key={t.slug}
                        href={`/grammar/${t.slug}`}
                        className="flex items-center justify-between rounded-cozy bg-surface px-5 py-4 shadow-cozy transition-transform hover:-translate-y-0.5"
                      >
                        <span className="font-medium">{t.titleTr}</span>
                        <span className="flex items-center gap-2 text-xs text-ink-soft">
                          {t.level && (
                            <span className="rounded-full bg-surface-2 px-2 py-0.5 font-semibold">
                              {t.level}
                            </span>
                          )}
                          {t.status === "ready" ? "📖" : "✨"}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </details>
          );
        })}
      </main>
    </div>
  );
}
