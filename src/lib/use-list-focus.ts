"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Deep-link focus for master lists (T-016 palette follow-up): when the active
 * key changes — palette navigation or a direct URL — reveal the section
 * containing the item, center it, and flash-highlight it. If the item's
 * section is already open (a manual sidebar click), only flash and scroll
 * when out of view: the user's section layout is left alone.
 *
 * `isRevealed` must answer from component/DOM state whether the item's
 * section is currently open — DOM visibility probing (offsetParent, rects)
 * is unreliable inside closed <details> (Chrome keeps layout for
 * hidden-until-found content), so the caller supplies the truth.
 *
 * Returns the key to flash; the caller styles the matching row with it.
 */
export function useListFocus(
  key: string | null | undefined,
  ready: boolean,
  getEl: (key: string) => HTMLElement | null,
  isRevealed: (key: string) => boolean,
  reveal: (key: string) => void,
): string | null {
  const [flash, setFlash] = useState<string | null>(null);
  const doneRef = useRef<string | null>(null);

  useEffect(() => {
    if (!key || !ready || doneRef.current === key) return;
    doneRef.current = key;

    const revealed = isRevealed(key);
    if (!revealed) reveal(key);
    // Double RAF: state-driven reveals render their rows one commit later.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = getEl(key);
        if (!el) return;
        const r = el.getBoundingClientRect();
        // 80px ≈ sticky header allowance.
        if (!revealed || r.top < 80 || r.bottom > window.innerHeight) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }),
    );
    setFlash(key);
    const t = setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(t);
    // Callbacks are per-render closures used once per key change; adding
    // them to deps would refire the effect every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  return flash;
}
