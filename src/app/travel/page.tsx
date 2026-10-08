"use client";

import { useMemo, useState } from "react";
import { useStrings } from "@/lib/i18n/use-strings";
import { useProfileMeta } from "@/lib/use-profile-meta";
import { stripFurigana } from "@/lib/jp";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { Furigana } from "@/components/shared/Furigana";
import { SpeakButton } from "@/components/shared/SpeakButton";
import {
  PHRASEBOOK_JA,
  SIGNS_JA,
  type Phrase,
} from "@/lib/travel/phrasebook-ja";

// T-099 part B: pocket phrasebook for the Japan trip. Static data, no LLM, no
// DB: it is part of the precached app shell, so it opens in airplane mode.

const S = {
  tr: {
    title: "Seyahat kılavuzu",
    intro:
      "Japonya'da cebinde: internetsiz de açılır. Kartlardaki ifadeler seyahat sprinti dersleriyle aynı.",
    search: "Ara (Türkçe, romaji veya Japonca)",
    signs: "Tabelalar",
    hear: "Duyacağın",
    empty: "Eşleşen ifade yok.",
    onlyJa: "Seyahat kılavuzu yalnızca Japonca profilinde var.",
  },
  en: {
    title: "Travel phrasebook",
    intro:
      "In your pocket in Japan: opens without internet. The phrases match the travel sprint lessons.",
    search: "Search (English, romaji or Japanese)",
    signs: "Signs",
    hear: "You'll hear",
    empty: "No matching phrase.",
    onlyJa: "The travel phrasebook exists only for the Japanese profile.",
  },
};

const SIGNS_KEY = "signs";

function matches(phrase: Phrase, q: string, ui: "tr" | "en") {
  const hay = [
    stripFurigana(phrase.jp),
    phrase.romaji,
    phrase.meaning[ui],
    phrase.note?.[ui] ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase(ui);
  return hay.includes(q);
}

export default function TravelPage() {
  const meta = useProfileMeta();
  const t = useStrings(S);
  const ui: "tr" | "en" = meta?.uiLanguage === "en" ? "en" : "tr";
  const [active, setActive] = useState(PHRASEBOOK_JA[0].key);
  const [query, setQuery] = useState("");
  const q = query.trim().toLocaleLowerCase(ui);

  // A query searches every section at once; otherwise show the active tab.
  const sections = useMemo(() => {
    if (q) {
      return PHRASEBOOK_JA.map((s) => ({
        ...s,
        phrases: s.phrases.filter((ph) => matches(ph, q, ui)),
      })).filter((s) => s.phrases.length > 0);
    }
    return PHRASEBOOK_JA.filter((s) => s.key === active);
  }, [q, ui, active]);

  const signs = useMemo(() => {
    if (!q) return active === SIGNS_KEY ? SIGNS_JA : [];
    return SIGNS_JA.filter((s) =>
      `${s.kanji} ${s.reading} ${s.meaning[ui]}`.toLocaleLowerCase(ui).includes(q)
    );
  }, [q, ui, active]);

  if (meta && meta.targetLanguage !== "ja") {
    return (
      <div className="min-h-dvh pb-16">
        <StatsHeader title={t.title} />
        <main className="mx-auto max-w-2xl px-4 py-8">
          <p className="text-sm text-ink-soft">{t.onlyJa}</p>
        </main>
      </div>
    );
  }

  const tabs = [
    ...PHRASEBOOK_JA.map((s) => ({ key: s.key, label: `${s.icon} ${s.title[ui]}` })),
    { key: SIGNS_KEY, label: `🪧 ${t.signs}` },
  ];

  return (
    <div className="min-h-dvh pb-16">
      <StatsHeader title={t.title} />
      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
        <p className="text-sm text-ink-soft">{t.intro}</p>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
          className="w-full rounded-cozy border-2 border-surface-2 bg-surface px-4 py-2.5 text-sm outline-none focus:border-indigo"
        />

        {!q && (
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActive(tab.key)}
                className={`cursor-pointer rounded-full border-2 px-3 py-1.5 text-sm transition-colors ${
                  active === tab.key
                    ? "border-indigo bg-indigo/10 font-semibold text-indigo"
                    : "border-surface-2 bg-surface text-ink-soft hover:border-indigo"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {sections.map((section) => (
          <section key={section.key} className="flex flex-col gap-3">
            {q && (
              <h2 className="text-sm font-semibold text-ink-soft">
                {section.icon} {section.title[ui]}
              </h2>
            )}
            {section.phrases.map((ph) => (
              <article
                key={ph.jp}
                className="rounded-cozy bg-surface px-4 py-3 shadow-cozy"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {ph.hear && (
                      <span className="mb-1 inline-block rounded-full bg-indigo/10 px-2 py-0.5 text-xs font-semibold text-indigo">
                        👂 {t.hear}
                      </span>
                    )}
                    <div className="text-lg leading-loose sm:text-xl">
                      <Furigana text={ph.jp} lang="ja" />
                    </div>
                    <div className="text-sm text-ink-soft">{ph.romaji}</div>
                    <div className="mt-1 font-semibold">{ph.meaning[ui]}</div>
                    {ph.note && (
                      <p className="mt-1 text-sm text-ink-soft">{ph.note[ui]}</p>
                    )}
                  </div>
                  <SpeakButton text={ph.jp} lang="ja-JP" className="shrink-0" />
                </div>
              </article>
            ))}
          </section>
        ))}

        {signs.length > 0 && (
          <section className="flex flex-col gap-3">
            {q && (
              <h2 className="text-sm font-semibold text-ink-soft">🪧 {t.signs}</h2>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {signs.map((s) => (
                <div
                  key={s.kanji}
                  className="rounded-cozy bg-surface px-3 py-3 text-center shadow-cozy"
                >
                  <div lang="ja" className="text-2xl font-semibold">
                    {s.kanji}
                  </div>
                  <div lang="ja" className="text-sm text-ink-soft">
                    {s.reading}
                  </div>
                  <div className="mt-1 text-sm">{s.meaning[ui]}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {q && sections.length === 0 && signs.length === 0 && (
          <p className="text-sm text-ink-soft">{t.empty}</p>
        )}
      </main>
    </div>
  );
}
