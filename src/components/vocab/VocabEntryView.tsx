"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CozyButton } from "@/components/shared/CozyButton";
import { Furigana } from "@/components/shared/Furigana";
import type { VocabContent } from "@/lib/llm/schemas";
import { useStrings } from "@/lib/i18n/use-strings";
import { useLocalizeError } from "@/lib/i18n/use-localize-error";
import { vocabDetail, vocabGenerate } from "@/lib/client-api";
import { levelDisplay } from "@/lib/curriculum/levels";

// Single-language per profile; the level scheme identifies it (N* = ja, else zh)
// for the target language and CJK typography lang attribute.
const langAndTarget = (level: string) =>
  level.startsWith("N")
    ? { lang: "ja", target: "ja" }
    : { lang: "zh-Hans", target: "zh" };

const S = {
  tr: {
    genericError: "Hata oluştu",
    loading: "Yükleniyor...",
    backToList: "← Sözlük",
    traditional: "Geleneksel",
    classifier: "Ölçü kelimesi",
    meaningsEnTitle: "Anlamlar (İngilizce)",
    examples: "Örnekler",
    collocations: "Eşdizimler",
    chars: "Karakterler",
    generating: "Kelime sayfası hazırlanıyor... birazdan burada olacak.",
    notPrepared: "Bu kelime henüz hazırlanmadı",
    lastAttemptFailed: " (son deneme başarısız oldu)",
    prepare: "Hazırla",
  },
  en: {
    genericError: "Something went wrong",
    loading: "Loading...",
    backToList: "← Dictionary",
    traditional: "Traditional",
    classifier: "Measure word",
    meaningsEnTitle: "Meanings (English)",
    examples: "Examples",
    collocations: "Collocations",
    chars: "Characters",
    generating: "Preparing the word page... it will appear here shortly.",
    notPrepared: "This word hasn't been prepared yet",
    lastAttemptFailed: " (last attempt failed)",
    prepare: "Prepare",
  },
};

interface EntryResponse {
  word: string;
  traditional: string | null;
  reading: string;
  meaningsEn: string[];
  classifiers: string[] | null;
  level: string;
  status: "pending" | "generating" | "ready" | "error";
  content: VocabContent | null;
}

export function VocabEntryView({ word }: { word: string }) {
  const s = useStrings(S);
  const localize = useLocalizeError();
  const [entry, setEntry] = useState<EntryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stopped = useRef(false);

  const load = useCallback(async () => {
    try {
      const body = (await vocabDetail(word)) as EntryResponse;
      if (stopped.current) return;
      setEntry(body);
      if (body.status === "generating") setTimeout(load, 3000);
    } catch (e) {
      if (!stopped.current)
        setError(localize(e));
    }
  }, [word, s]);

  useEffect(() => {
    stopped.current = false;
    setEntry(null);
    setError(null);
    load();
    return () => {
      stopped.current = true;
    };
  }, [load]);

  const generate = async () => {
    await vocabGenerate(word).catch(() => {});
    setEntry((e) => (e ? { ...e, status: "generating" } : e));
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
  if (!entry) {
    return <div className="py-24 text-center text-ink-soft">{s.loading}</div>;
  }

  const { lang, target } = langAndTarget(entry.level);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Link
          href="/vocab"
          className="rounded-full bg-surface-2 px-3 py-1.5 text-sm hover:bg-accent-soft transition-colors lg:hidden"
        >
          {s.backToList}
        </Link>
        <h1 className="font-display text-3xl font-bold" lang={lang}>
          {entry.word}
        </h1>
        <div className="min-w-0">
          <div className="text-lg text-ink-soft">{entry.reading}</div>
          {entry.traditional && (
            <div className="text-xs text-ink-soft">
              {s.traditional}: <span lang={lang}>{entry.traditional}</span>
            </div>
          )}
        </div>
        <span className="ml-auto shrink-0 rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold text-ink-soft">
          {levelDisplay(target, entry.level)}
        </span>
      </div>

      {entry.classifiers && entry.classifiers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-soft">{s.classifier}:</span>
          {entry.classifiers.map((c) => (
            <span
              key={c}
              lang={lang}
              className="rounded-full bg-surface px-3 py-1 shadow-cozy"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {entry.status === "ready" && entry.content ? (
        <>
          <div className="rounded-cozy bg-surface p-5 shadow-cozy">
            <div className="text-lg font-semibold">
              {entry.content.meanings_tr.join(", ")}
            </div>
            {entry.content.note_tr && (
              <p className="mt-2 text-sm text-ink-soft">
                <Furigana text={entry.content.note_tr} />
              </p>
            )}
            {entry.content.classifier_note_tr && (
              <p className="mt-2 text-sm text-ink-soft">
                <Furigana text={entry.content.classifier_note_tr} />
              </p>
            )}
          </div>

          <section className="rounded-cozy bg-surface p-5 shadow-cozy">
            <h2 className="mb-3 font-semibold">{s.examples}</h2>
            <div className="flex flex-col gap-3">
              {entry.content.examples.map((ex, i) => (
                <div key={i} className="rounded-xl bg-background p-4">
                  <div className="text-lg">
                    <Furigana text={ex.sentence} />
                  </div>
                  <div className="text-sm font-medium">{ex.translation_tr}</div>
                </div>
              ))}
            </div>
          </section>

          {entry.content.collocations &&
            entry.content.collocations.length > 0 && (
              <section className="rounded-cozy bg-surface p-5 shadow-cozy">
                <h2 className="mb-3 font-semibold">{s.collocations}</h2>
                <div className="flex flex-col gap-2">
                  {entry.content.collocations.map((c, i) => (
                    <div key={i} className="flex flex-wrap items-baseline gap-2">
                      <span className="text-base">
                        <Furigana text={c.phrase} />
                      </span>
                      <span className="text-sm text-ink-soft">
                        {c.meaning_tr}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

          {entry.content.chars && entry.content.chars.length > 0 && (
            <section className="rounded-cozy bg-surface p-5 shadow-cozy">
              <h2 className="mb-3 font-semibold">{s.chars}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {entry.content.chars.map((c, i) => (
                  <div key={i} className="rounded-xl bg-background p-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl" lang={lang}>
                        {c.char}
                      </span>
                      <span className="text-sm text-ink-soft">{c.reading}</span>
                      <span className="text-sm font-medium">{c.meaning_tr}</span>
                    </div>
                    {c.hint_tr && (
                      <p className="mt-1 text-xs text-ink-soft">{c.hint_tr}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : entry.status === "generating" ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <div className="animate-float-slow text-5xl">📜</div>
          <p className="text-ink-soft">{s.generating}</p>
        </div>
      ) : (
        <>
          <div className="rounded-cozy bg-surface p-5 shadow-cozy">
            <h2 className="mb-2 text-sm font-semibold text-ink-soft">
              {s.meaningsEnTitle}
            </h2>
            <p>{entry.meaningsEn.join("; ")}</p>
          </div>
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="text-5xl">✨</div>
            <p className="text-ink-soft">
              {s.notPrepared}
              {entry.status === "error" ? s.lastAttemptFailed : ""}.
            </p>
            <CozyButton onClick={generate}>{s.prepare}</CozyButton>
          </div>
        </>
      )}
    </div>
  );
}
