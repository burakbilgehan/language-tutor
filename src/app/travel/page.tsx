"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStrings } from "@/lib/i18n/use-strings";
import { useProfileMeta } from "@/lib/use-profile-meta";
import { stripFurigana } from "@/lib/jp";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { PhraseCard } from "@/components/travel/PhraseCard";
import { GuideView } from "@/components/travel/GuideView";
import { KanjiGroupView } from "@/components/travel/KanjiGroupView";
import {
  GUIDES_JA,
  KANJI_GROUPS_JA,
  PHRASEBOOK_JA,
  type Guide,
  type Phrase,
} from "@/lib/travel";

// T-099/T-100: the Japan travel handbook. Static data, no LLM, no DB: part of
// the precached app shell, so all of it opens in airplane mode. Three tabs
// (guides, sign kanji, phrasebook) plus one search across everything.
// Navigation lives in the URL (?tab=, ?guide=) so the back button works.

const S = {
  tr: {
    title: "Seyahat",
    intro:
      "Japonya için cep rehberin: internetsiz de açılır. Rehberler adım adım anlatır, kanjiler tabelada göreceklerini, kalıplar söyleyeceklerini toplar.",
    tabs: { guides: "📚 Rehberler", kanji: "🈯 Kanjiler", phrases: "💬 Kalıplar" },
    search: "Ara (Türkçe, romaji, Japonca)",
    hear: "Duyacağın",
    reply: "Cevap",
    staff: "Görevli",
    you: "Sen",
    tip: "İpucu",
    on: "On",
    kun: "Kun",
    seen: "Nerede",
    stroke: "Yazılışını çalış",
    back: "← Rehberler",
    blocks: (n: number) => `${n} bölüm`,
    phrasesCount: (n: number) => `${n} kalıp`,
    kanjiCount: (n: number) => `${n} kanji`,
    empty: "Eşleşen bir şey yok.",
    resultsGuides: "Rehberler",
    resultsKanji: "Kanjiler",
    resultsPhrases: "Kalıplar",
    onlyJa: "Seyahat rehberi yalnızca Japonca profilinde var.",
  },
  en: {
    title: "Travel",
    intro:
      "Your pocket guide for Japan: opens without internet. Guides walk you through step by step, kanji collects what you will see on signs, phrases what you will say.",
    tabs: { guides: "📚 Guides", kanji: "🈯 Kanji", phrases: "💬 Phrases" },
    search: "Search (English, romaji, Japanese)",
    hear: "You'll hear",
    reply: "Reply",
    staff: "Staff",
    you: "You",
    tip: "Tip",
    on: "On",
    kun: "Kun",
    seen: "Where",
    stroke: "Practise writing it",
    back: "← Guides",
    blocks: (n: number) => `${n} sections`,
    phrasesCount: (n: number) => `${n} phrases`,
    kanjiCount: (n: number) => `${n} kanji`,
    empty: "Nothing matches.",
    resultsGuides: "Guides",
    resultsKanji: "Kanji",
    resultsPhrases: "Phrases",
    onlyJa: "The travel guide exists only for the Japanese profile.",
  },
};

type Tab = "guides" | "kanji" | "phrases";

const norm = (s: string, ui: "tr" | "en") => s.toLocaleLowerCase(ui);

function phraseText(p: Phrase, ui: "tr" | "en") {
  return [
    stripFurigana(p.jp),
    p.romaji,
    p.meaning[ui],
    p.note?.[ui] ?? "",
    p.reply ? `${stripFurigana(p.reply.jp)} ${p.reply.romaji} ${p.reply.meaning[ui]}` : "",
  ].join(" ");
}

function guidePhrases(g: Guide): Phrase[] {
  return g.blocks.flatMap((b) => (b.type === "phrases" ? b.items : []));
}

function Chips<K extends string>({
  items,
  active,
  onPick,
}: {
  items: { key: K; label: string }[];
  active: K;
  onPick: (k: K) => void;
}) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {items.map((it) => (
        <button
          key={it.key}
          onClick={() => onPick(it.key)}
          className={`shrink-0 cursor-pointer whitespace-nowrap rounded-full border-2 px-3 py-1.5 text-sm transition-colors ${
            active === it.key
              ? "border-indigo bg-indigo-soft font-semibold text-indigo"
              : "border-surface-2 bg-surface text-ink-soft hover:border-indigo"
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

function TravelInner() {
  const meta = useProfileMeta();
  const t = useStrings(S);
  const router = useRouter();
  const params = useSearchParams();
  const ui: "tr" | "en" = meta?.uiLanguage === "en" ? "en" : "tr";

  const tab = (params.get("tab") as Tab | null) ?? "guides";
  const guideKey = params.get("guide");
  const guide = guideKey ? GUIDES_JA.find((g) => g.key === guideKey) : undefined;

  const [kanjiGroup, setKanjiGroup] = useState(KANJI_GROUPS_JA[0]?.key ?? "");
  const [phraseSection, setPhraseSection] = useState(PHRASEBOOK_JA[0]?.key ?? "");
  const [query, setQuery] = useState("");
  const q = norm(query.trim(), ui);

  const go = (next: { tab?: Tab; guide?: string }) => {
    const sp = new URLSearchParams();
    sp.set("tab", next.tab ?? tab);
    if (next.guide) sp.set("guide", next.guide);
    router.push(`/travel?${sp.toString()}`);
    window.scrollTo(0, 0);
  };

  const labels = {
    hear: t.hear,
    reply: t.reply,
    staff: t.staff,
    you: t.you,
    tip: t.tip,
  };

  const results = useMemo(() => {
    if (!q) return null;
    const guides = GUIDES_JA.filter((g) =>
      norm(`${g.title[ui]} ${g.summary[ui]}`, ui).includes(q)
    );
    const kanji = KANJI_GROUPS_JA.flatMap((g) => g.kanji).filter((k) =>
      norm(
        [
          k.kanji,
          k.meaning[ui],
          ...k.compounds.map((c) => `${c.word} ${c.reading} ${c.romaji} ${c.meaning[ui]}`),
        ].join(" "),
        ui
      ).includes(q)
    );
    const seen = new Set<string>();
    const phrases = [
      ...PHRASEBOOK_JA.flatMap((s) => s.phrases),
      ...GUIDES_JA.flatMap(guidePhrases),
    ].filter((p) => {
      if (seen.has(p.jp)) return false;
      seen.add(p.jp);
      return norm(phraseText(p, ui), ui).includes(q);
    });
    return { guides, kanji, phrases: phrases.slice(0, 60) };
  }, [q, ui]);

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

  const searchBox = (
    <input
      type="search"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder={t.search}
      className="w-full rounded-cozy border-2 border-surface-2 bg-surface px-4 py-2.5 text-sm outline-none focus:border-indigo"
    />
  );

  let body: React.ReactNode;
  if (guide && !results) {
    body = (
      <>
        <button
          onClick={() => router.back()}
          className="cursor-pointer self-start text-sm text-indigo hover:underline"
        >
          {t.back}
        </button>
        <GuideView guide={guide} ui={ui} labels={labels} />
        <button
          onClick={() => router.back()}
          className="cursor-pointer self-start text-sm text-indigo hover:underline"
        >
          {t.back}
        </button>
      </>
    );
  } else if (results) {
    const nothing =
      results.guides.length + results.kanji.length + results.phrases.length === 0;
    body = nothing ? (
      <p className="text-sm text-ink-soft">{t.empty}</p>
    ) : (
      <div className="flex flex-col gap-6">
        {results.guides.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-ink-soft">{t.resultsGuides}</h2>
            {results.guides.map((g) => (
              <button
                key={g.key}
                onClick={() => {
                  setQuery("");
                  go({ tab: "guides", guide: g.key });
                }}
                className="cursor-pointer rounded-cozy bg-surface px-4 py-3 text-left shadow-cozy hover:ring-2 hover:ring-indigo"
              >
                {g.icon} <span className="font-semibold">{g.title[ui]}</span>
              </button>
            ))}
          </section>
        )}
        {results.kanji.length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-ink-soft">{t.resultsKanji}</h2>
            <div className="flex flex-wrap gap-2">
              {results.kanji.map((k) => (
                <button
                  key={k.kanji}
                  onClick={() => {
                    const g = KANJI_GROUPS_JA.find((g) => g.kanji.includes(k));
                    if (g) setKanjiGroup(g.key);
                    setQuery("");
                    go({ tab: "kanji" });
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-cozy bg-surface px-3 py-2 shadow-cozy hover:ring-2 hover:ring-indigo"
                >
                  <span lang="ja" className="text-2xl font-semibold">{k.kanji}</span>
                  <span className="text-sm">{k.meaning[ui]}</span>
                </button>
              ))}
            </div>
          </section>
        )}
        {results.phrases.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-ink-soft">{t.resultsPhrases}</h2>
            {results.phrases.map((p) => (
              <PhraseCard key={p.jp} phrase={p} ui={ui} hearLabel={t.hear} replyLabel={t.reply} />
            ))}
          </section>
        )}
      </div>
    );
  } else if (tab === "kanji") {
    const group = KANJI_GROUPS_JA.find((g) => g.key === kanjiGroup) ?? KANJI_GROUPS_JA[0];
    body = (
      <>
        <Chips
          items={KANJI_GROUPS_JA.map((g) => ({
            key: g.key,
            label: `${g.icon} ${g.title[ui]}`,
          }))}
          active={group?.key ?? ""}
          onPick={setKanjiGroup}
        />
        {group && (
          <KanjiGroupView
            group={group}
            ui={ui}
            labels={{ on: t.on, kun: t.kun, seen: t.seen, stroke: t.stroke }}
          />
        )}
      </>
    );
  } else if (tab === "phrases") {
    const section = PHRASEBOOK_JA.find((s) => s.key === phraseSection) ?? PHRASEBOOK_JA[0];
    body = (
      <>
        <Chips
          items={PHRASEBOOK_JA.map((s) => ({
            key: s.key,
            label: `${s.icon} ${s.title[ui]}`,
          }))}
          active={section?.key ?? ""}
          onPick={setPhraseSection}
        />
        {section?.intro && <p className="text-sm text-ink-soft">{section.intro[ui]}</p>}
        <div className="flex flex-col gap-3">
          {section?.phrases.map((p) => (
            <PhraseCard key={p.jp} phrase={p} ui={ui} hearLabel={t.hear} replyLabel={t.reply} />
          ))}
        </div>
      </>
    );
  } else {
    body = (
      <div className="grid gap-3 sm:grid-cols-2">
        {GUIDES_JA.map((g) => (
          <button
            key={g.key}
            onClick={() => go({ tab: "guides", guide: g.key })}
            className="flex cursor-pointer flex-col gap-1 rounded-cozy bg-surface px-4 py-4 text-left shadow-cozy transition-transform hover:-translate-y-0.5 hover:ring-2 hover:ring-indigo"
          >
            <div className="text-3xl">{g.icon}</div>
            <div className="font-display text-lg font-semibold">{g.title[ui]}</div>
            <p className="text-sm text-ink-soft">{g.summary[ui]}</p>
            <div className="mt-1 text-xs text-ink-soft">
              {t.blocks(g.blocks.length)} · {t.phrasesCount(guidePhrases(g).length)}
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-16">
      <StatsHeader title={t.title} />
      <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6">
        {!guide && <p className="text-sm text-ink-soft">{t.intro}</p>}
        {searchBox}
        {!results && !guide && (
          <div className="grid grid-cols-3 gap-1 rounded-cozy bg-surface-2 p-1">
            {(["guides", "kanji", "phrases"] as Tab[]).map((k) => (
              <button
                key={k}
                onClick={() => go({ tab: k })}
                className={`cursor-pointer rounded-[0.9rem] px-2 py-2 text-sm font-semibold transition-colors ${
                  tab === k
                    ? "bg-surface text-indigo shadow-cozy"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {t.tabs[k]}
              </button>
            ))}
          </div>
        )}
        {body}
      </main>
    </div>
  );
}

// useSearchParams needs a Suspense boundary in static export.
export default function TravelPage() {
  return (
    <Suspense fallback={null}>
      <TravelInner />
    </Suspense>
  );
}
