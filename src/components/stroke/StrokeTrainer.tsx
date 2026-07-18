"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import HanziWriter from "hanzi-writer";
import { CozyButton } from "@/components/shared/CozyButton";
import { GOJUON, DAKUTEN, GOJUON_HEADERS, STROKE_KANA, type KanaCell } from "@/lib/kana";
import type { KanjiContent } from "@/lib/llm/schemas";
import { withBase } from "@/lib/base-path";
import { useStrings } from "@/lib/i18n/use-strings";
import {
  kanjiList as kanjiList$,
  kanjiDetail,
  kanjiGenerate,
  kanjiGenerateBatch,
} from "@/lib/client-api";

const S = {
  tr: {
    loading: "Yükleniyor...",
    kanjiListEmpty: "Kanji listesi bulunamadı.",
    readyCount: (ready: number, total: number) => `${ready}/${total} hazır`,
    generatingShort: "⏳ hazırlanıyor…",
    generateAll: "Hepsini hazırla",
    noStrokeData: "Bu karakter için çizim verisi yok.",
    watch: "▶ İzle",
    draw: "✎ Çiz",
    quizStatus: (remaining: number | null, mistakes: number) =>
      `Sıradaki çizgiyi çiz${remaining !== null ? ` — kalan: ${remaining}` : ""}${mistakes > 0 ? ` · ${mistakes} hata` : ""}`,
    doneStatus: (mistakes: number) =>
      `✓ Tamamlandı${mistakes > 0 ? ` (${mistakes} hata)` : " — hatasız!"}`,
    meaning: "Anlam",
    examples: "Örnekler",
    contentGenerating: "⏳ Türkçe içerik hazırlanıyor...",
    contentNotReady: (failed: boolean) =>
      `Türkçe anlamlar ve örnekler henüz hazırlanmadı${failed ? " (son deneme başarısız)" : ""}.`,
    generate: "Hazırla",
  },
  en: {
    loading: "Loading...",
    kanjiListEmpty: "Kanji list not found.",
    readyCount: (ready: number, total: number) => `${ready}/${total} ready`,
    generatingShort: "⏳ generating…",
    generateAll: "Prepare all",
    noStrokeData: "No stroke data for this character.",
    watch: "▶ Watch",
    draw: "✎ Draw",
    quizStatus: (remaining: number | null, mistakes: number) =>
      `Trace the next stroke${remaining !== null ? ` — remaining: ${remaining}` : ""}${mistakes > 0 ? ` · ${mistakes} mistakes` : ""}`,
    doneStatus: (mistakes: number) =>
      `✓ Completed${mistakes > 0 ? ` (${mistakes} mistakes)` : " — flawless!"}`,
    meaning: "Meaning",
    examples: "Examples",
    contentGenerating: "⏳ Preparing Turkish content...",
    contentNotReady: (failed: boolean) =>
      `Turkish meanings and examples are not prepared yet${failed ? " (last attempt failed)" : ""}.`,
    generate: "Prepare",
  },
};

type Tab = "hira" | "kata" | "kanji";
type Mode = "idle" | "quiz" | "done";

interface KanjiListItem {
  char: string;
  level: string;
  status: "pending" | "generating" | "ready" | "error";
  meaningsEn: string[];
}

interface KanjiDetail {
  char: string;
  level: string;
  onyomi: string[];
  kunyomi: string[];
  meaningsEn: string[];
  status: KanjiListItem["status"];
  content: KanjiContent | null;
}

const LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
const SIZE = 300;

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

export function StrokeTrainer({ initialChar }: { initialChar?: string } = {}) {
  const t = useStrings(S);
  // Deep-link (/stroke?char=光 from the cmd+K palette): open on the kanji tab
  // with that glyph selected. The reset effect below keys on `selectedKana`
  // (undefined for a kanji), so a deep-linked kanji survives the async list
  // load without being clobbered back to kanjiList[0].
  const [tab, setTab] = useState<Tab>(initialChar ? "kanji" : "hira");
  const [selected, setSelected] = useState<string>(
    initialChar ?? STROKE_KANA[0].hira,
  );

  // Palette navigation while already on /stroke only changes the query param —
  // no remount, so follow initialChar changes too. Depends ONLY on initialChar:
  // including `selected` would snap back the user's manual picks.
  useEffect(() => {
    if (initialChar) {
      setTab("kanji");
      setSelected(initialChar);
    }
  }, [initialChar]);
  const [mode, setMode] = useState<Mode>("idle");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [dataMissing, setDataMissing] = useState(false);

  const [kanjiList, setKanjiList] = useState<KanjiListItem[] | null>(null);
  const [detail, setDetail] = useState<KanjiDetail | null>(null);

  const boxRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- writer lifecycle ------------------------------------------------------

  useEffect(() => {
    if (!boxRef.current) return;
    setDataMissing(false);
    setMode("idle");
    setRemaining(null);
    setMistakes(0);

    // hanzi-writer's setCharacter doesn't let us swap the error handler state,
    // so recreate per character — creation is cheap, data is HTTP-cached.
    boxRef.current.innerHTML = "";
    writerRef.current = HanziWriter.create(boxRef.current, selected, {
      width: SIZE,
      height: SIZE,
      padding: 12,
      showOutline: true,
      strokeColor: cssVar("--ink", "#2e2a24"),
      outlineColor: cssVar("--surface-2", "#f1e9db"),
      drawingColor: cssVar("--accent", "#c4643b"),
      highlightColor: cssVar("--accent", "#c4643b"),
      drawingWidth: 18,
      showHintAfterMisses: 2,
      charDataLoader: (char: string) =>
        fetch(withBase(`/strokes-data/${encodeURIComponent(char)}.json`)).then((r) => {
          if (!r.ok) throw new Error("stroke data missing");
          return r.json();
        }),
      onLoadCharDataError: () => setDataMissing(true),
    });
    // Show the stroke order once before the user traces it.
    writerRef.current.animateCharacter();
  }, [selected]);

  const watch = () => {
    const w = writerRef.current;
    if (!w) return;
    w.cancelQuiz();
    setMode("idle");
    setRemaining(null);
    w.showCharacter();
    w.animateCharacter();
  };

  const startQuiz = () => {
    const w = writerRef.current;
    if (!w) return;
    setMode("quiz");
    setMistakes(0);
    setRemaining(null);
    w.quiz({
      onMistake: () => setMistakes((m) => m + 1),
      onCorrectStroke: (s: { strokesRemaining: number }) =>
        setRemaining(s.strokesRemaining),
      onComplete: () => setMode("done"),
    });
  };

  // --- kanji list + detail ---------------------------------------------------

  useEffect(() => {
    if (tab !== "kanji" || kanjiList) return;
    kanjiList$()
      .then((d) => setKanjiList((d.entries ?? []) as KanjiListItem[]))
      .catch(() => setKanjiList([]));
  }, [tab, kanjiList]);

  // While a batch is generating (auto current-level fill or the per-level
  // button), keep the list fresh so tiles flip to "ready" as they land.
  useEffect(() => {
    if (tab !== "kanji" || !kanjiList?.some((k) => k.status === "generating"))
      return;
    const t = setTimeout(() => {
      kanjiList$()
        .then((d) => setKanjiList((d.entries ?? []) as KanjiListItem[]))
        .catch(() => {});
    }, 5000);
    return () => clearTimeout(t);
  }, [tab, kanjiList]);

  const generateLevel = async (level: string) => {
    await kanjiGenerateBatch(level).catch(() => {});
    setKanjiList(
      (list) =>
        list?.map((k) =>
          k.level === level && (k.status === "pending" || k.status === "error")
            ? { ...k, status: "generating" }
            : k
        ) ?? null
    );
  };

  const isKanji = tab === "kanji";

  const loadDetail = useCallback(async (char: string) => {
    try {
      const d = (await kanjiDetail(char)) as KanjiDetail;
      setDetail(d);
      if (d.status === "generating") {
        pollRef.current = setTimeout(() => loadDetail(char), 3000);
      }
    } catch {
      /* detail panel just stays empty */
    }
  }, []);

  useEffect(() => {
    if (pollRef.current) clearTimeout(pollRef.current);
    setDetail(null);
    if (isKanji) loadDetail(selected);
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [selected, isKanji, loadDetail]);

  const generate = async () => {
    await kanjiGenerate(selected).catch(() => {});
    setDetail((d) => (d ? { ...d, status: "generating" } : d));
    setKanjiList(
      (list) =>
        list?.map((k) =>
          k.char === selected ? { ...k, status: "generating" } : k
        ) ?? null
    );
    pollRef.current = setTimeout(() => loadDetail(selected), 3000);
  };

  // --- picker data -----------------------------------------------------------

  const pick = (tab: Tab, char: string) => {
    setTab(tab);
    setSelected(char);
  };

  const kanaCells: KanaCell[] = STROKE_KANA;
  const selectedKana = kanaCells.find(
    (k) => k.hira === selected || k.kata === selected
  );

  // Keep the selection meaningful when the tab changes: hira↔kata swap to the
  // matching glyph; entering the kanji tab selects the first kanji if the
  // current selection isn't one.
  const switchTab = (t: Tab) => {
    setTab(t);
    if (t === "hira" && selectedKana) setSelected(selectedKana.hira);
    else if (t === "kata" && selectedKana) setSelected(selectedKana.kata);
    else if (t === "kanji" && selectedKana && kanjiList?.length)
      setSelected(kanjiList[0].char);
  };

  useEffect(() => {
    if (tab === "kanji" && kanjiList?.length && selectedKana) {
      setSelected(kanjiList[0].char);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, kanjiList]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-8 lg:flex-row">
      {/* ---- picker ---- */}
      <aside className="w-full shrink-0 lg:sticky lg:top-[calc(var(--header-h)+16px)] lg:max-h-[calc(100dvh-var(--header-h)-32px)] lg:w-96 lg:overflow-y-auto">
        <div className="mb-3 flex gap-1.5">
          {(
            [
              ["hira", "Hiragana"],
              ["kata", "Katakana"],
              ["kanji", "Kanji"],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                tab === t
                  ? "bg-accent text-white"
                  : "bg-surface text-ink-soft shadow-cozy hover:bg-surface-2"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab !== "kanji" ? (
          <div className="flex flex-col gap-3">
            {[
              ["Gojūon", GOJUON],
              ["Dakuten ゛゜", DAKUTEN],
            ].map(([title, rows]) => (
              <div key={title as string} className="rounded-cozy bg-surface p-2 shadow-cozy">
                <div className="mb-1 px-1 text-xs font-semibold tracking-wider text-accent">
                  {(title as string).toUpperCase()}
                </div>
                <table className="w-full border-separate border-spacing-0.5">
                  <thead>
                    <tr>
                      <th className="w-5" />
                      {GOJUON_HEADERS.map((h) => (
                        <th key={h} className="pb-0.5 text-center text-[0.6rem] font-semibold text-accent">
                          {h.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(rows as typeof GOJUON).map((row, ri) => (
                      <tr key={ri}>
                        <td className="pr-1 text-right text-[0.6rem] font-semibold text-accent">
                          {row.label.toUpperCase()}
                        </td>
                        {row.cells.map((cell, ci) => {
                          if (!cell) return <td key={ci} />;
                          const ch = tab === "hira" ? cell.hira : cell.kata;
                          return (
                            <td key={ci} className="p-0">
                              <button
                                lang="ja"
                                onClick={() => pick(tab, ch)}
                                title={cell.romaji}
                                className={`flex w-full flex-col items-center rounded-lg py-0.5 leading-tight transition-colors ${
                                  selected === ch
                                    ? "bg-accent-soft font-semibold"
                                    : "bg-background hover:bg-surface-2"
                                }`}
                              >
                                <span className="text-base">{ch}</span>
                                <span className="text-[0.55rem] text-ink-soft">{cell.romaji}</span>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : kanjiList === null ? (
          <p className="p-4 text-center text-sm text-ink-soft">{t.loading}</p>
        ) : kanjiList.length === 0 ? (
          <p className="p-4 text-center text-sm text-ink-soft">
            {t.kanjiListEmpty}
          </p>
        ) : (
          LEVELS.map((lvl) => {
            const items = kanjiList.filter((k) => k.level === lvl);
            if (items.length === 0) return null;
            const ready = items.filter((k) => k.status === "ready").length;
            const generating = items.some((k) => k.status === "generating");
            return (
              <details key={lvl} open={lvl === "N5"} className="mb-2">
                <summary className="mb-1.5 cursor-pointer font-bold">
                  {lvl}{" "}
                  <span className="text-xs font-normal text-ink-soft">
                    {t.readyCount(ready, items.length)}
                  </span>
                  {generating ? (
                    <span className="ml-2 text-xs font-normal text-accent">
                      {t.generatingShort}
                    </span>
                  ) : (
                    ready < items.length && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          generateLevel(lvl);
                        }}
                        className="ml-2 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-normal hover:bg-accent-soft transition-colors cursor-pointer"
                      >
                        {t.generateAll}
                      </button>
                    )
                  )}
                </summary>
                <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-8">
                  {items.map((k) => (
                    <button
                      key={k.char}
                      lang="ja"
                      onClick={() => pick("kanji", k.char)}
                      title={k.meaningsEn.join(", ")}
                      className={`aspect-square rounded-xl text-lg transition-colors ${
                        selected === k.char
                          ? "bg-accent-soft font-semibold"
                          : k.status === "ready"
                            ? "bg-moss-soft shadow-cozy hover:bg-surface-2"
                            : "bg-surface shadow-cozy hover:bg-surface-2"
                      }`}
                    >
                      {k.char}
                    </button>
                  ))}
                </div>
              </details>
            );
          })
        )}
      </aside>

      {/* ---- practice area ---- */}
      <main className="flex w-full min-w-0 flex-1 flex-col gap-5">
        <section className="flex flex-col items-center gap-4 rounded-cozy bg-surface p-6 shadow-cozy">
          {dataMissing ? (
            <div className="flex h-[300px] flex-col items-center justify-center gap-2 text-ink-soft">
              <div className="text-3xl">🍂</div>
              <p>{t.noStrokeData}</p>
            </div>
          ) : (
            <div className="relative" style={{ width: SIZE, height: SIZE }}>
              {/* crosshair guides under the SVG */}
              <div className="pointer-events-none absolute inset-0 rounded-xl border border-surface-2">
                <div className="absolute left-1/2 top-0 h-full border-l border-dashed border-surface-2" />
                <div className="absolute top-1/2 left-0 w-full border-t border-dashed border-surface-2" />
              </div>
              <div ref={boxRef} className="relative touch-none" />
            </div>
          )}

          <div className="flex items-center gap-3">
            <CozyButton onClick={watch}>{t.watch}</CozyButton>
            <CozyButton onClick={startQuiz}>{t.draw}</CozyButton>
          </div>

          <div className="min-h-6 text-sm text-ink-soft">
            {mode === "quiz" && <span>{t.quizStatus(remaining, mistakes)}</span>}
            {mode === "done" && (
              <span className="font-semibold text-moss">
                {t.doneStatus(mistakes)}
              </span>
            )}
          </div>
        </section>

        {/* ---- character info ---- */}
        {!isKanji && selectedKana && (
          <section className="rounded-cozy bg-surface p-5 text-center shadow-cozy">
            <span className="font-display text-3xl font-bold">
              {selectedKana.romaji}
            </span>
            <span className="ml-3 text-ink-soft" lang="ja">
              {selectedKana.hira} / {selectedKana.kata}
            </span>
          </section>
        )}

        {isKanji && detail && (
          <section className="flex flex-col gap-4 rounded-cozy bg-surface p-5 shadow-cozy">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
              <span lang="ja" className="font-display text-4xl font-bold">
                {detail.char}
              </span>
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold">
                {detail.level}
              </span>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="font-semibold text-accent">Onyomi</dt>
              <dd lang="ja">{detail.onyomi.join("、") || "—"}</dd>
              <dt className="font-semibold text-accent">Kunyomi</dt>
              <dd lang="ja">{detail.kunyomi.join("、") || "—"}</dd>
              <dt className="font-semibold text-accent">{t.meaning}</dt>
              <dd>
                {detail.content
                  ? detail.content.meanings_tr.join(", ")
                  : detail.meaningsEn.join(", ")}
              </dd>
            </dl>

            {detail.status === "ready" && detail.content ? (
              <>
                {detail.content.note_tr && (
                  <p className="rounded-xl bg-background p-3 text-sm text-ink-soft">
                    {detail.content.note_tr}
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  <h3 className="font-semibold">{t.examples}</h3>
                  {detail.content.examples.map((ex, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-baseline gap-x-3 rounded-xl bg-background p-3"
                    >
                      <span lang="ja" className="text-lg">
                        {ex.word}
                      </span>
                      <span lang="ja" className="text-sm text-ink-soft">
                        {ex.reading}
                      </span>
                      <span className="text-sm font-medium">
                        {ex.meaning_tr}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : detail.status === "generating" ? (
              <p className="text-sm text-ink-soft">{t.contentGenerating}</p>
            ) : (
              <div className="flex items-center gap-3">
                <p className="text-sm text-ink-soft">
                  {t.contentNotReady(detail.status === "error")}
                </p>
                <CozyButton onClick={generate}>{t.generate}</CozyButton>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
