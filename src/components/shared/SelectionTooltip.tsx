"use client";

import { useEffect, useRef, useState } from "react";
import { hasJapanese, toRomajiReading } from "@/lib/jp";
import { useProfileMeta } from "@/lib/use-profile-meta";
import { useStrings } from "@/lib/i18n/use-strings";
import { translateText, kanjiLookupApi } from "@/lib/client-api";

const S = {
  tr: {
    translate: "Çevir",
    translating: "Çevriliyor…",
    translateFailed: "Çeviri alınamadı",
  },
  en: {
    translate: "Translate",
    translating: "Translating…",
    translateFailed: "Translation failed",
  },
};

interface KanjiInfo {
  char: string;
  reading: string;
  meaning: string;
}

interface WordInfo {
  reading: string;
  gloss: string;
}

interface TipState {
  /** Selection with furigana (<rt>) dropped — the real source text. */
  source: string;
  /** Romaji reading, or null when it adds nothing over the source. */
  romaji: string | null;
  x: number;
  y: number;
  below: boolean;
  kanji: KanjiInfo[];
  /** Whole-selection dictionary entry (compound reading + gloss), if any. */
  word: WordInfo | null;
  translation: string | null;
  translating: boolean;
}

const KANJI_RE = /[一-鿿々]/;

/**
 * Global tooltip: select any Japanese text with the mouse and its romaji
 * reading appears above the selection. Kanji readings come from the
 * surrounding <ruby> furigana when present; selected kanji also get their
 * dictionary meaning (via /api/kanji/lookup) and a click-to-translate button.
 */
export function SelectionTooltip() {
  const strings = useStrings(S);
  const [tip, setTip] = useState<TipState | null>(null);
  // Monotonic token so a stale lookup/translation can't clobber a newer tip.
  const seq = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  // ja: romaji via wanakana + kanji dictionary lookup. zh: the reading comes
  // straight from the pinyin ruby (wanakana would garble hanzi), and
  // per-character meanings arrive with the translate click. Other languages
  // have no CJK selection to annotate.
  const lang = useProfileMeta()?.targetLanguage;
  const isJa = lang === "ja";
  const isCjk = isJa || lang === "zh";

  useEffect(() => {
    if (!isCjk) return;
    const update = () => {
      const sel = window.getSelection();
      const raw = sel?.toString().trim() ?? "";
      if (!sel || sel.isCollapsed || !raw || raw.length > 120 || !hasJapanese(raw)) {
        seq.current++;
        setTip(null);
        return;
      }
      // Two views of the selection: `source` drops <rt> furigana (the text as
      // written), `phonetic` substitutes each <ruby> base with its <rt>
      // reading so kanji become kana and romaji conversion covers them.
      let source = raw;
      let phonetic = raw;
      try {
        const range = sel.getRangeAt(0);
        const srcFrag = range.cloneContents();
        srcFrag.querySelectorAll("rt").forEach((rt) => rt.remove());
        source = srcFrag.textContent?.trim() || raw;

        const phFrag = range.cloneContents();
        phFrag.querySelectorAll("ruby").forEach((ruby) => {
          const rt = ruby.querySelector("rt");
          if (rt?.textContent) {
            ruby.replaceWith(document.createTextNode(rt.textContent));
          }
        });
        phonetic = phFrag.textContent?.trim() || source;
      } catch {
        /* keep raw */
      }
      // ja: kana→romaji. zh: the ruby-substituted string IS the pinyin.
      const converted = isJa ? toRomajiReading(phonetic) : phonetic;
      const romaji = converted !== source ? converted : null;
      const hasKanji = KANJI_RE.test(source);
      if (!romaji && !hasKanji) {
        seq.current++;
        setTip(null);
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      const token = ++seq.current;
      // Clamp into the viewport; flip below the selection when the top is
      // too close to the screen edge (tooltip is anchored bottom-up).
      const x = Math.min(Math.max(rect.left + rect.width / 2, 170), window.innerWidth - 170);
      const flipBelow = rect.top < 150;
      setTip({
        source,
        romaji,
        x,
        y: flipBelow ? rect.bottom + 8 : rect.top,
        below: flipBelow,
        kanji: [],
        word: null,
        translation: null,
        translating: false,
      });
      if (!isJa) {
        // zh: per-char meanings from the translations CACHE, instantly and
        // for free; uncached chars arrive with the translate click.
        const chars = [...new Set(source.match(/[一-鿿]/g) ?? [])].slice(0, 6);
        chars.forEach((ch) => {
          translateText(ch, true)
            .then((d) => d)
            .catch(() => null)
            .then((d: { translation: string | null } | null) => {
              if (!d?.translation || seq.current !== token) return;
              setTip((t) =>
                t
                  ? {
                      ...t,
                      kanji: [
                        ...t.kanji.filter((k) => k.char !== ch),
                        { char: ch, reading: "", meaning: d.translation! },
                      ],
                    }
                  : t
              );
            })
            .catch(() => {});
        });
        return;
      }
      kanjiLookupApi(source)
        .then((d) => d)
        .catch(() => null)
        .then(
          (data: { kanji: KanjiInfo[]; word: WordInfo | null } | null) => {
            if (!data || seq.current !== token) return;
            if (!data.kanji.length && !data.word) return;
            setTip((t) =>
              t ? { ...t, kanji: data.kanji, word: data.word } : t
            );
          }
        )
        .catch(() => {});
    };

    const onMouseUp = (e: MouseEvent) => {
      // A click on the tooltip itself (Çevir) must not rebuild the tip.
      if (containerRef.current?.contains(e.target as Node)) return;
      setTimeout(update, 0);
    };
    const onSelectionChange = () => {
      if (window.getSelection()?.isCollapsed) {
        seq.current++;
        setTip(null);
      }
    };
    const onScroll = () => {
      seq.current++;
      setTip(null);
    };

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("selectionchange", onSelectionChange);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("selectionchange", onSelectionChange);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [isCjk, isJa]);

  const translate = () => {
    if (!tip || tip.translating || tip.translation) return;
    const token = seq.current;
    setTip((t) => (t ? { ...t, translating: true } : t));
    // zh: alongside the whole-selection translation, fetch each distinct
    // hanzi's own meaning (translations table caches per char — each char
    // costs one LLM call ever). Compounds vs characters differ, so both
    // views matter.
    if (!isJa && tip.source.length > 1) {
      const chars = [...new Set(tip.source.match(/[一-鿿]/g) ?? [])].slice(0, 6);
      chars.forEach((ch) => {
        translateText(ch)
          .then((d) => d)
          .catch(() => null)
          .then((d: { translation: string | null } | null) => {
            if (!d?.translation || seq.current !== token) return;
            setTip((t) =>
              t
                ? {
                    ...t,
                    kanji: [
                      ...t.kanji.filter((k) => k.char !== ch),
                      { char: ch, reading: "", meaning: d.translation! },
                    ],
                  }
                : t
            );
          })
          .catch(() => {});
      });
    }
    translateText(tip.source)
      .then((d) => d)
      .catch(() => null)
      .then((data: { translation: string | null } | null) => {
        if (seq.current !== token) return;
        setTip((t) =>
          t
            ? {
                ...t,
                translating: false,
                translation: data?.translation ?? strings.translateFailed,
              }
            : t
        );
      })
      .catch(() => {
        if (seq.current !== token) return;
        setTip((t) =>
          t ? { ...t, translating: false, translation: strings.translateFailed } : t
        );
      });
  };

  if (!tip) return null;

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none fixed z-50 max-w-xs -translate-x-1/2 rounded-lg bg-ink px-3 py-1.5 text-sm text-background shadow-cozy ${
        tip.below ? "" : "-translate-y-full"
      }`}
      style={{ left: tip.x, top: tip.below ? tip.y : tip.y - 6 }}
    >
      {tip.romaji && <div className="font-medium">{tip.romaji}</div>}
      {tip.word && (
        <div className="mt-1 border-t border-background/20 pt-1 text-xs">
          <span lang="ja" className="font-medium">
            {tip.word.reading}
          </span>
          <span className="text-background/70">
            {" "}
            ({toRomajiReading(tip.word.reading)})
          </span>
          <span> — {tip.word.gloss}</span>
        </div>
      )}
      {tip.kanji.length > 0 && (
        <div className="mt-1 space-y-0.5 border-t border-background/20 pt-1 text-xs">
          {tip.kanji.map((k) => (
            <div key={k.char}>
              <span lang="ja" className="font-medium">
                {k.char}
              </span>
              {k.reading && (
                <span lang="ja" className="text-background/70">
                  {" "}
                  {k.reading}
                </span>
              )}
              <span> — {k.meaning}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-1 border-t border-background/20 pt-1 text-xs">
        {tip.translation ? (
          <span>{tip.translation}</span>
        ) : tip.translating ? (
          <span className="text-background/70">{strings.translating}</span>
        ) : (
          <button
            type="button"
            className="pointer-events-auto cursor-pointer font-medium text-background/80 underline decoration-dotted underline-offset-2 hover:text-background"
            onMouseDown={(e) => e.preventDefault()}
            onClick={translate}
          >
            {strings.translate}
          </button>
        )}
      </div>
      {/* EDRDG licence: on-screen acknowledgement wherever JMdict/KANJIDIC2
          data is shown (full details on /about). ja-only — the zh path is
          LLM-translated, not dictionary data. */}
      {isJa && (tip.word || tip.kanji.length > 0) && (
        <div className="mt-1 text-right text-[10px] text-background/50">
          JMdict/KANJIDIC2 © EDRDG
        </div>
      )}
    </div>
  );
}
