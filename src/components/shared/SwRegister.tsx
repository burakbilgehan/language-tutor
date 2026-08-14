"use client";

import { useEffect } from "react";
import { withBase } from "@/lib/base-path";

// T-095 offline shell: registers the service worker (out/sw.js) so a first
// online visit precaches the whole static export and every later visit works
// in airplane mode. Production only: the dev server must not cache dev
// chunks, and registration is pointless there anyway.
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    if (!window.isSecureContext) return;
    navigator.serviceWorker
      .register(withBase("/sw.js"), { updateViaCache: "none" })
      .catch((err) => console.warn("[sw] kayıt başarısız:", err));
  }, []);
  return null;
}
