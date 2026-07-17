"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GrammarTable } from "@/components/grammar/GrammarTable";
import { CozyButton } from "@/components/shared/CozyButton";
import { Furigana } from "@/components/shared/Furigana";
import type { GrammarTopicContent } from "@/lib/llm/schemas";
import { useStrings } from "@/lib/i18n/use-strings";

const S = {
  tr: {
    loadFailed: "Yüklenemedi",
    genericError: "Hata oluştu",
    loading: "Yükleniyor...",
    backToTopics: "← Konular",
    examples: "Örnekler",
    generating: "Tablolar hazırlanıyor... birazdan burada olacak.",
    notPrepared: "Bu konu henüz hazırlanmadı",
    lastAttemptFailed: " (son deneme başarısız oldu)",
    prepare: "Hazırla",
  },
  en: {
    loadFailed: "Failed to load",
    genericError: "Something went wrong",
    loading: "Loading...",
    backToTopics: "← Topics",
    examples: "Examples",
    generating: "Preparing the tables... they'll appear here shortly.",
    notPrepared: "This topic hasn't been prepared yet",
    lastAttemptFailed: " (last attempt failed)",
    prepare: "Prepare",
  },
};

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
  const s = useStrings(S);
  const [topic, setTopic] = useState<TopicResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stopped = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/grammar/${slug}`);
      if (!res.ok) throw new Error((await res.json()).error ?? s.loadFailed);
      const body: TopicResponse = await res.json();
      if (stopped.current) return;
      setTopic(body);
      if (body.status === "generating") setTimeout(load, 3000);
    } catch (e) {
      if (!stopped.current)
        setError(e instanceof Error ? e.message : s.genericError);
    }
  }, [slug, s]);

  useEffect(() => {
    stopped.current = false;
    setTopic(null);
    setError(null);
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
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <div className="text-4xl">🍂</div>
        <p className="text-ink-soft">{error}</p>
      </div>
    );
  }
  if (!topic) {
    return (
      <div className="py-24 text-center text-ink-soft">{s.loading}</div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link
          href="/grammar"
          className="rounded-full bg-surface-2 px-3 py-1.5 text-sm hover:bg-accent-soft transition-colors lg:hidden"
        >
          {s.backToTopics}
        </Link>
        <h1 className="font-display text-xl font-bold">{topic.titleTr}</h1>
      </div>

      {topic.status === "ready" && topic.content ? (
        <>
          <p className="rounded-cozy bg-surface p-5 text-ink-soft shadow-cozy">
            <Furigana text={topic.content.intro_tr} />
          </p>
          {topic.content.tables.map((t, i) => (
            <GrammarTable key={i} table={t} />
          ))}
          <section className="rounded-cozy bg-surface p-5 shadow-cozy">
            <h2 className="mb-3 font-semibold">{s.examples}</h2>
            <div className="flex flex-col gap-3">
              {topic.content.examples.map((ex, i) => (
                <div key={i} className="rounded-xl bg-background p-4">
                  <div className="text-lg"><Furigana text={ex.target} /></div>
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
          <p className="text-ink-soft">{s.generating}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="text-5xl">✨</div>
          <p className="text-ink-soft">
            {s.notPrepared}{topic.status === "error" ? s.lastAttemptFailed : ""}.
          </p>
          <CozyButton onClick={generate}>{s.prepare}</CozyButton>
        </div>
      )}
    </div>
  );
}
