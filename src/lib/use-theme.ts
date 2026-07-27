"use client";

import { useEffect, useState } from "react";

/** Effective dark-mode state + toggle. The explicit class ("dark"/"light" on
 * <html>, persisted to localStorage) wins; with neither class the system
 * preference decides — mirroring globals.css's `:root:not(.light)` media rule.
 * All mounted controls (header button, settings switch) stay in sync via a
 * window event, so the toggle always flips the *effective* theme, not a
 * possibly-stale local copy. */
export function useTheme(): { dark: boolean; toggle: () => void } {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const read = () => setDark(effectiveDark());
    read();
    window.addEventListener("theme:change", read);
    return () => window.removeEventListener("theme:change", read);
  }, []);

  const toggle = () => {
    const next = !effectiveDark();
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.classList.toggle("light", !next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Private-mode storage failure: the class still applies for this page.
    }
    window.dispatchEvent(new Event("theme:change"));
  };

  return { dark, toggle };
}

function effectiveDark(): boolean {
  const cl = document.documentElement.classList;
  if (cl.contains("dark")) return true;
  if (cl.contains("light")) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
