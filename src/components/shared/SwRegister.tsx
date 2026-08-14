"use client";

import { useEffect, useRef, useState } from "react";
import { withBase } from "@/lib/base-path";
import { useStrings } from "@/lib/i18n/use-strings";

// T-095 offline shell: registers the service worker (out/sw.js) so a first
// online visit precaches the whole static export and every later visit works
// in airplane mode. Production only: the dev server must not cache dev
// chunks, and registration is pointless there anyway.
//
// The SW posts {type:"okumo-precache", done, total, version} while filling;
// when done, this shows a one-time banner per version so the user knows the
// moment it is safe to go offline (an interrupted install self-heals on the
// next online load, see public/sw.js).

const S = {
  tr: { ready: "Çevrimdışı mod hazır: uçak modunda da açabilirsin.", ok: "Tamam" },
  en: { ready: "Offline mode ready: you can open the app in airplane mode.", ok: "OK" },
};

const LS_KEY = "okumo-offline-ready-version";

export function SwRegister() {
  const t = useStrings(S);
  const [ready, setReady] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    if (!window.isSecureContext) return;

    let cancelled = false;
    const onMessage = (ev: MessageEvent) => {
      const d = ev.data;
      if (!d || d.type !== "okumo-precache" || !d.done) return;
      if (typeof d.version !== "string") return;
      if (localStorage.getItem(LS_KEY) === d.version) return; // toasted before
      if (cancelled) return;
      localStorage.setItem(LS_KEY, d.version);
      setReady(true);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setReady(false), 8000);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    navigator.serviceWorker
      .register(withBase("/sw.js"), { updateViaCache: "none" })
      .catch((err) => console.warn("[sw] kayıt başarısız:", err));
    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener("message", onMessage);
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  if (!ready) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3">
      <div className="flex w-full max-w-2xl items-center gap-3 rounded-cozy bg-surface px-4 py-3 shadow-cozy ring-1 ring-surface-2">
        <span className="min-w-0 flex-1 text-sm">{t.ready}</span>
        <button
          type="button"
          onClick={() => setReady(false)}
          className="rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-2"
        >
          {t.ok}
        </button>
      </div>
    </div>
  );
}
