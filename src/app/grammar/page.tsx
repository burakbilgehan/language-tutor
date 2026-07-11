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
  particles: "Edatlar",
  verbs: "Fiiller",
  adjectives: "Sıfatlar",
  nouns: "İsimler",
  numbers: "Sayılar",
  syntax: "Cümle Yapısı",
};

export default function GrammarIndexPage() {
  const [topics, setTopics] = useState<TopicDto[] | null>(null);

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

  const byCategory = new Map<string, TopicDto[]>();
  for (const t of topics) {
    const list = byCategory.get(t.category) ?? [];
    list.push(t);
    byCategory.set(t.category, list);
  }

  return (
    <div className="min-h-dvh pb-16">
      <StatsHeader title="Gramer Kütüphanesi" backHref="/map" />
      <main className="mx-auto max-w-2xl px-4 py-8">
        {topics.length === 0 && (
          <p className="text-center text-ink-soft">
            Müfredat oluşunca gramer konuları burada listelenecek.
          </p>
        )}
        {[...byCategory.entries()].map(([cat, list]) => (
          <section key={cat} className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">
              {CATEGORY_LABELS[cat] ?? cat}
            </h2>
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
      </main>
    </div>
  );
}
