"use client";

// T-060 (merge fix 2): Settings'teki LLM yüzeyi.
//
// Üç-kapı IA'sı Settings'te de KALIR (Burak kararı) — ama Settings'te
// sihirbazı "bitirmenin" gidilecek bir sonraki adımı yok. Eskiden onDone
// sihirbazı remount edip kapı ekranına döndürüyordu; "Şimdilik bağlamadan
// başla"ya basan kullanıcı için bu görsel bir no-op'tu (aynı ekran, hiçbir
// tepki). Artık tamamlama — bağlanarak ya da bağlanmadan — sihirbazı kısa
// bir özet satırına indiriyor; "Yeniden aç" onu geri getiriyor.
//
// Config güvenliği DEĞİŞMEDİ: "bağlamadan devam" hâlâ hiçbir şey yazmaz,
// bu komponent de yazmaz. Burada tutulan tek şey, bu oturumdaki görsel
// katlanma durumu.
//
// Kasıtlı olarak dar: T-063'ün bağlantı durumu kartı bu özet satırının
// yerine geçecek (gerçek "şu an neye bağlısın" bilgisiyle), sihirbazın
// kendisine dokunmadan.

import { useState } from "react";
import { useStrings } from "@/lib/i18n/use-strings";
import { LlmSetupWizard, type WizardOutcome } from "./LlmSetupWizard";

const S = {
  tr: {
    title: "Yapay zekâ bağlantısı",
    connected: "Bağlantı kaydedildi. Dersler ve sohbet açık.",
    skipped:
      "Bağlanmadan devam ediliyor — hazır kütüphane çalışır, ders üretimi ve sohbet bekler.",
    reopen: "Yeniden aç",
  },
  en: {
    title: "AI connection",
    connected: "Connection saved. Lessons and chat are on.",
    skipped:
      "Continuing without a connection — the ready-made library works; lesson generation and chat wait.",
    reopen: "Reopen",
  },
};

export function LlmSettingsSection() {
  const t = useStrings(S);
  // null = sihirbaz açık. Bir sonuç geldiğinde özete katlanır.
  const [outcome, setOutcome] = useState<WizardOutcome | null>(null);
  // Yeniden açışta sihirbazı sıfırdan başlat (kapı ekranından).
  const [instance, setInstance] = useState(0);

  if (outcome) {
    return (
      <section className="rounded-cozy bg-surface p-6 shadow-cozy">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-semibold">{t.title}</h2>
          <button
            type="button"
            onClick={() => {
              setOutcome(null);
              setInstance((n) => n + 1);
            }}
            className="text-xs font-semibold text-indigo hover:underline"
          >
            {t.reopen}
          </button>
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          {outcome === "connected" ? t.connected : t.skipped}
        </p>
      </section>
    );
  }

  return <LlmSetupWizard key={instance} onDone={setOutcome} />;
}
