"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useProfileMeta } from "@/lib/use-profile-meta";
import { useStrings } from "@/lib/i18n/use-strings";
import {
  buildSearchIndex,
  searchIndex,
  type SearchKind,
  type SearchResult,
} from "@/lib/search-index";

const S = {
  tr: {
    // Examples must match the profile's target language — a Dutch learner
    // has no business seeing "hikari → 光".
    placeholders: {
      ja: "Ara: kanji, kelime, gramer… (hikari → 光)",
      zh: "Ara: kelime, pinyin, gramer… (pengyou → 朋友)",
      default: "Ara: gramer konuları…",
    },
    empty: "Sonuç yok.",
    hint: "Aramak için yazmaya başla",
    kinds: { kanji: "kanji", vocab: "kelime", grammar: "gramer" } as Record<
      SearchKind,
      string
    >,
  },
  en: {
    placeholders: {
      ja: "Search: kanji, words, grammar… (hikari → 光)",
      zh: "Search: words, pinyin, grammar… (pengyou → 朋友)",
      default: "Search: grammar topics…",
    },
    empty: "No results.",
    hint: "Start typing to search",
    kinds: { kanji: "kanji", vocab: "word", grammar: "grammar" } as Record<
      SearchKind,
      string
    >,
  },
};

/** ⌘K on Mac, Ctrl+K elsewhere. Resolved client-side (SSR default: Mac). */
export function useShortcutLabel(): string {
  const [label, setLabel] = useState("⌘K");
  useEffect(() => {
    if (!/Mac|iPhone|iPad/.test(navigator.platform)) setLabel("Ctrl+K");
  }, []);
  return label;
}

/**
 * Global cmd/ctrl-K command palette (T-016). Reading-aware search over the
 * static kanji/vocab/grammar indexes — deterministic, works in static mode.
 * Mounted once in layout.tsx alongside the other global overlays.
 */
export function CommandPalette() {
  const t = useStrings(S);
  const router = useRouter();
  const shortcut = useShortcutLabel();
  const lang = useProfileMeta()?.targetLanguage ?? "";

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  // Spotlight-style drag offset, reset on every open.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Built once per language; the source indexes are static imports.
  const index = useMemo(() => buildSearchIndex(lang), [lang]);
  const results = useMemo(
    () => searchIndex(index, query, lang),
    [index, query, lang],
  );

  // cmd/ctrl-K toggles. The header search button dispatches a "palette:open"
  // event so a visible, mouse-reachable trigger exists too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("palette:open", onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("palette:open", onOpen);
    };
  }, []);

  // Reset transient state each time the palette opens; focus the input.
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setOffset({ x: 0, y: 0 });
      // next tick so the input exists
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const go = (r: SearchResult) => {
    setOpen(false);
    router.push(r.href);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]);
    }
  };

  // Drag anywhere on the panel that isn't an interactive element.
  const onPanelPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("input, button, a")) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: offset.x,
      baseY: offset.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPanelPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset({ x: d.baseX + e.clientX - d.startX, y: d.baseY + e.clientY - d.startY });
  };
  const onPanelPointerUp = () => {
    dragRef.current = null;
  };

  const placeholder =
    t.placeholders[lang as keyof typeof t.placeholders] ??
    t.placeholders.default;
  const cjk = lang === "ja" || lang === "zh";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/30 px-4 pt-[12vh]"
      onMouseDown={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl touch-none overflow-hidden rounded-cozy bg-surface shadow-cozy ring-1 ring-black/5"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={onPanelPointerDown}
        onPointerMove={onPanelPointerMove}
        onPointerUp={onPanelPointerUp}
      >
        <div className="flex cursor-grab items-center border-b border-surface-2 pr-3 active:cursor-grabbing">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-base outline-none placeholder:text-ink-soft"
          />
          <kbd className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 font-sans text-xs text-ink-soft">
            {shortcut}
          </kbd>
        </div>
        <div className="max-h-[55vh] overflow-y-auto">
          {query.trim() === "" ? (
            <p className="px-4 py-6 text-center text-sm text-ink-soft">
              {t.hint}
            </p>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-soft">
              {t.empty}
            </p>
          ) : (
            <ul>
              {results.map((r, i) => (
                <li key={`${r.kind}:${r.href}`}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === active ? "bg-accent-soft" : "hover:bg-surface-2"
                    }`}
                  >
                    <span
                      lang={cjk ? lang : undefined}
                      className="min-w-8 shrink-0 text-center text-xl"
                    >
                      {r.title}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        {r.reading && (
                          <span className="text-sm text-ink-soft">
                            {r.reading}
                          </span>
                        )}
                        <span className="truncate text-sm">{r.subtitle}</span>
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[0.65rem] font-semibold text-ink-soft">
                      {t.kinds[r.kind]} · {r.level}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
