"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { GrammarTable } from "@/components/grammar/GrammarTable";
import { CozyButton } from "@/components/shared/CozyButton";
import type { GrammarTopicContent } from "@/lib/llm/schemas";

interface TopicResponse {
  slug: string;
  titleTr: string;
  status: "pending" | "generating" | "ready" | "error";
  content: GrammarTopicContent | null;
}

export default function GrammarTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [topic, setTopic] = useState<TopicResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stopped = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/grammar/${slug}`);
      if (!res.ok) throw new Error((await res.json()).error ?? "Yüklenemedi");
      const body: TopicResponse = await res.json();
      if (stopped.current) return;
      setTopic(body);
      if (body.status === "generating") setTimeout(load, 3000);
    } catch (e) {
      if (!stopped.current)
        setError(e instanceof Error ? e.message : "Hata oluştu");
    }
  }, [slug]);

  useEffect(() => {
    stopped.current = false;
    load();
    return () => {
      stopped.current = true;
    };
  }, [load]);

  const generate = async () => {
    await fetch(`/api/grammar/${slug}`, { method: "POST" });
    setTopic((t) => (t ? { ...t, status: "generating" } : t));
    setTimeout(load, 3000);
  };

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="text-4xl">🍂</div>
        <p className="text-ink-soft">{error}</p>
      </div>
    );
  }
  if (!topic) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-ink-soft">
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-16">
      <StatsHeader title={topic.titleTr} backHref="/grammar" />
      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-8">
        {topic.status === "ready" && topic.content ? (
          <>
            <p className="rounded-cozy bg-surface p-5 text-ink-soft shadow-cozy">
              {topic.content.intro_tr}
            </p>
            {topic.content.tables.map((t, i) => (
              <GrammarTable key={i} table={t} />
            ))}
            <section className="rounded-cozy bg-surface p-5 shadow-cozy">
              <h2 className="mb-3 font-semibold">Örnekler</h2>
              <div className="flex flex-col gap-3">
                {topic.content.examples.map((ex, i) => (
                  <div key={i} className="rounded-xl bg-background p-4">
                    <div lang="ja" className="text-lg">{ex.target}</div>
                    {ex.reading && (
                      <div className="text-sm text-ink-soft">{ex.reading}</div>
                    )}
                    <div className="text-sm font-medium">{ex.translation_tr}</div>
                  </div>
                ))}
              </div>
            </section>
            {topic.content.related_slugs &&
              topic.content.related_slugs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {topic.content.related_slugs.map((s) => (
                    <Link
                      key={s}
                      href={`/grammar/${s}`}
                      className="rounded-full bg-surface-2 px-4 py-2 text-sm hover:bg-accent-soft transition-colors"
                    >
                      → {s}
                    </Link>
                  ))}
                </div>
              )}
          </>
        ) : topic.status === "generating" ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="animate-float-slow text-5xl">📜</div>
            <p className="text-ink-soft">
              Tablolar hazırlanıyor... birazdan burada olacak.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="text-5xl">✨</div>
            <p className="text-ink-soft">
              Bu konu henüz hazırlanmadı{topic.status === "error" ? " (son deneme başarısız oldu)" : ""}.
            </p>
            <CozyButton onClick={generate}>Hazırla</CozyButton>
          </div>
        )}
      </main>
    </div>
  );
}
