"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStrings } from "@/lib/i18n/use-strings";
import { useLlmStatus } from "@/lib/llm-status";
import { useListFocus } from "@/lib/use-list-focus";
import {
  vocabList,
  vocabGenerate,
  vocabGenerateBatch,
  type VocabEntrySummary,
} from "@/lib/client-api";
import { rankVocab } from "@/lib/vocab-search";

const STATUS_ICONS: Record<VocabEntrySummary["status"], string> = {
  ready: "📖",
  generating: "⏳",
  error: "⚠️",
  pending: "✨",
};

const SEARCH_CAP = 100;

// The dictionary is single-language per profile; the level scheme identifies
// it (N* = JLPT/ja, HSK* = zh) for the CJK typography lang attribute.
const langForLevel = (level: string) =>
  level.startsWith("N") ? "ja" : "zh-Hans";

const S = {
  tr: {
    statuses: {
      ready: "Hazır",
      generating: "Hazırlanıyor",
      error: "Hata — tekrar denenecek",
      pending: "Henüz hazırlanmadı",
    } as Record<VocabEntrySummary["status"], string>,
    levels: {
      HSK1: "HSK 1 — Başlangıç",
      HSK2: "HSK 2 — Temel",
      HSK3: "HSK 3 — Orta Öncesi",
      HSK4: "HSK 4 — Orta",
      HSK5: "HSK 5 — Orta-İleri",
      HSK6: "HSK 6 — İleri",
      N5: "JLPT N5 — Başlangıç",
      N4: "JLPT N4 — Temel",
      N3: "JLPT N3 — Orta",
      N2: "JLPT N2 — Orta-İleri",
      N1: "JLPT N1 — İleri",
    } as Record<string, string>,
    loading: "Yükleniyor...",
    empty: "Bu dil için sözlük index'i yok.",
    searchPlaceholder: "Ara: kelime, okunuş veya anlam",
    searchMore: (n: number) => `+${n} sonuç daha — aramayı daralt`,
    noResults: "Sonuç yok.",
    prepareCount: (n: number) => `${n} kelimeyi hazırla`,
    clickToGenerate: (status: string) => `${status} — üretmek için tıkla`,
  },
  en: {
    statuses: {
      ready: "Ready",
      generating: "Generating",
      error: "Error — will retry",
      pending: "Not prepared yet",
    } as Record<VocabEntrySummary["status"], string>,
    levels: {
      HSK1: "HSK 1 — Beginner",
      HSK2: "HSK 2 — Elementary",
      HSK3: "HSK 3 — Pre-Intermediate",
      HSK4: "HSK 4 — Intermediate",
      HSK5: "HSK 5 — Upper-Intermediate",
      HSK6: "HSK 6 — Advanced",
      N5: "JLPT N5 — Beginner",
      N4: "JLPT N4 — Elementary",
      N3: "JLPT N3 — Intermediate",
      N2: "JLPT N2 — Upper-Intermediate",
      N1: "JLPT N1 — Advanced",
    } as Record<string, string>,
    loading: "Loading...",
    empty: "No dictionary index for this language.",
    searchPlaceholder: "Search: word, reading or meaning",
    searchMore: (n: number) => `+${n} more results — narrow the search`,
    noResults: "No results.",
    prepareCount: (n: number) => `Prepare ${n} words`,
    clickToGenerate: (status: string) => `${status} — click to generate`,
  },
};

export function VocabSidebar() {
  const s = useStrings(S);
  const llm = useLlmStatus();
  const activeWord = useSearchParams().get("word");

  const [entries, setEntries] = useState<VocabEntrySummary[] | null>(null);
  const [query, setQuery] = useState("");
  const [openLevels, setOpenLevels] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const d = await vocabList().catch(() => ({ entries: [] }));
    const list = d.entries ?? [];
    setEntries(list);
    if (list.some((e) => e.status === "generating")) {
      pollRef.current = setTimeout(load, 3000);
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [load]);

  // Deep-link list focus (palette navigation): open only the level group of
  // the active word, scroll its row into view, flash it. A manual click on a
  // visible row only flashes — section layout stays put.
  const flashWord = useListFocus(
    activeWord,
    !!entries?.length,
    (w) => document.getElementById(`vocab-row-${w}`),
    (w) => {
      const level = entries?.find((v) => v.word === w)?.level;
      return !!level && openLevels.has(level);
    },
    (w) => {
      const level = entries?.find((v) => v.word === w)?.level;
      if (level) setOpenLevels(new Set([level]));
    },
  );

  const generateOne = async (e: React.MouseEvent, v: VocabEntrySummary) => {
    e.preventDefault();
    e.stopPropagation();
    if (!llm.configured) return; // LLM'siz: hazırlama tetiklenmez
    if (v.status === "ready" || v.status === "generating") return;
    setEntries((prev) =>
      prev
        ? prev.map((x) =>
            x.word === v.word ? { ...x, status: "generating" } : x
          )
        : prev
    );
    await vocabGenerate(v.word).catch(() => {});
    if (pollRef.current) clearTimeout(pollRef.current);
    pollRef.current = setTimeout(load, 3000);
  };

  const generateLevel = async (level: string) => {
    setBatchBusy(true);
    try {
      await vocabGenerateBatch(level).catch(() => {});
      await load();
    } finally {
      setBatchBusy(false);
    }
  };

  if (!entries) {
    return (
      <div className="p-6 text-center text-sm text-ink-soft">{s.loading}</div>
    );
  }
  if (entries.length === 0) {
    return <p className="p-6 text-center text-sm text-ink-soft">{s.empty}</p>;
  }

  const row = (v: VocabEntrySummary) => (
    <Link
      key={v.word}
      id={`vocab-row-${v.word}`}
      href={`/vocab?word=${encodeURIComponent(v.word)}`}
      className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
        flashWord === v.word ? "ring-2 ring-accent " : ""
      }${
        activeWord === v.word
          ? "bg-accent-soft font-semibold text-ink"
          : "bg-surface text-ink hover:bg-surface-2"
      }`}
    >
      <span className="min-w-0 truncate">
        <span className="mr-2 text-base" lang={langForLevel(v.level)}>
          {v.word}
        </span>
        <span className="mr-2 text-xs text-ink-soft">{v.reading}</span>
        <span className="text-xs text-ink-soft">{v.meaningsEn[0]}</span>
      </span>
      <button
        title={
          v.status === "pending" || v.status === "error"
            ? s.clickToGenerate(s.statuses[v.status])
            : s.statuses[v.status]
        }
        onClick={(e) => generateOne(e, v)}
        className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs transition-colors ${
          v.status === "pending" || v.status === "error"
            ? "cursor-pointer hover:bg-accent-soft"
            : "cursor-default"
        }`}
      >
        {STATUS_ICONS[v.status]}
      </button>
    </Link>
  );

  // Arama modu: katmanlı skorlu sıralama (T-033), DOM'u küçük tutmak için
  // CAP'li. rankVocab zaten position sırasını (seviye-major + frekans) katman
  // içi eşitlik bozucu olarak koruyor — entries burada ekstra sıralanmıyor.
  if (query.trim()) {
    const matches = rankVocab(entries, query);
    return (
      <div className="flex flex-col gap-3 p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={s.searchPlaceholder}
          className="rounded-xl bg-surface px-3 py-2 text-sm shadow-cozy outline-none focus:ring-2 focus:ring-accent-soft"
        />
        <div className="flex flex-col gap-1">
          {matches.slice(0, SEARCH_CAP).map(row)}
        </div>
        {matches.length === 0 && (
          <p className="text-center text-sm text-ink-soft">{s.noResults}</p>
        )}
        {matches.length > SEARCH_CAP && (
          <p className="text-center text-xs text-ink-soft">
            {s.searchMore(matches.length - SEARCH_CAP)}
          </p>
        )}
      </div>
    );
  }

  // Seviye grupları. Kapalı seviyelerin satırları hiç render edilmez —
  // ~5000 satırlık listede DOM'u küçük tutan asıl önlem bu.
  const levelOrder: string[] = [];
  const byLevel = new Map<string, VocabEntrySummary[]>();
  for (const v of entries) {
    if (!byLevel.has(v.level)) {
      levelOrder.push(v.level);
      byLevel.set(v.level, []);
    }
    byLevel.get(v.level)!.push(v);
  }
  const toggle = (lvl: string) =>
    setOpenLevels((prev) => {
      const next = new Set(prev);
      if (next.has(lvl)) next.delete(lvl);
      else next.add(lvl);
      return next;
    });

  return (
    <div className="flex flex-col gap-3 p-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={s.searchPlaceholder}
        className="rounded-xl bg-surface px-3 py-2 text-sm shadow-cozy outline-none focus:ring-2 focus:ring-accent-soft"
      />
      {levelOrder.map((lvl) => {
        const all = byLevel.get(lvl)!;
        const readyCount = all.filter((v) => v.status === "ready").length;
        const pendingCount = all.filter(
          (v) => v.status === "pending" || v.status === "error"
        ).length;
        const open = openLevels.has(lvl);
        return (
          <section key={lvl}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <button
                onClick={() => toggle(lvl)}
                className="flex items-center gap-2 font-bold text-ink"
              >
                <span className="text-xs">{open ? "▾" : "▸"}</span>
                <span>{s.levels[lvl] ?? lvl}</span>
                <span className="text-xs font-normal text-ink-soft">
                  {readyCount}/{all.length}
                </span>
              </button>
              {pendingCount > 0 && llm.configured && (
                <button
                  disabled={batchBusy}
                  onClick={() => generateLevel(lvl)}
                  title={s.prepareCount(pendingCount)}
                  className="ml-auto rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-accent-soft disabled:opacity-40"
                >
                  {batchBusy ? "..." : `↓ ${pendingCount}`}
                </button>
              )}
            </div>
            {open && <div className="flex flex-col gap-1">{all.map(row)}</div>}
          </section>
        );
      })}
    </div>
  );
}
