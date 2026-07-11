"use client";

import { useEffect, useState } from "react";
import { hasJapanese, toRomajiReading } from "@/lib/jp";

interface TipState {
  text: string;
  x: number;
  y: number;
}

/**
 * Global tooltip: select any Japanese text with the mouse and its romaji
 * reading appears above the selection. Kanji characters pass through
 * unchanged (their furigana is already visible via <ruby>).
 */
export function SelectionTooltip() {
  const [tip, setTip] = useState<TipState | null>(null);

  useEffect(() => {
    const update = () => {
      const sel = window.getSelection();
      const raw = sel?.toString().trim() ?? "";
      if (!sel || sel.isCollapsed || !raw || raw.length > 120 || !hasJapanese(raw)) {
        setTip(null);
        return;
      }
      // Selections over <ruby> drag the <rt> reading text along — drop the
      // rt contents by cloning and removing them.
      let text = raw;
      try {
        const frag = sel.getRangeAt(0).cloneContents();
        frag.querySelectorAll("rt").forEach((rt) => rt.remove());
        const clean = frag.textContent?.trim();
        if (clean) text = clean;
      } catch {
        /* keep raw */
      }
      const romaji = toRomajiReading(text);
      if (!romaji || romaji === text) {
        setTip(null);
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setTip({
        text: romaji,
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    };

    const onMouseUp = () => setTimeout(update, 0);
    const onSelectionChange = () => {
      if (window.getSelection()?.isCollapsed) setTip(null);
    };
    const onScroll = () => setTip(null);

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("selectionchange", onSelectionChange);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("selectionchange", onSelectionChange);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, []);

  if (!tip) return null;

  return (
    <div
      className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-background shadow-cozy"
      style={{ left: tip.x, top: tip.y - 6 }}
    >
      {tip.text}
    </div>
  );
}
