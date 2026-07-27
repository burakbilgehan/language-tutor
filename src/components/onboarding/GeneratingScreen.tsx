"use client";

import { useEffect, useState } from "react";
import { CozyButton } from "@/components/shared/CozyButton";
import { pick } from "@/lib/i18n";

// Rendered before a profile exists, so the language comes in as a prop
// (the wizard passes draft.uiLanguage); pick() falls back to tr if absent.
const S = {
  tr: {
    statusLines: [
      "Profilini inceliyorum...",
      "Hedeflerine uygun bir rota çiziyorum...",
      "Üniteleri ilgi alanlarına göre süslüyorum...",
      "Egzersizleri hazırlıyorum...",
      "Gramer haritanı oluşturuyorum...",
      "Son rötuşlar... Bu biraz sürebilir, çayını tazele ☕",
    ],
    jobNotFound: "Üretim kaydı bulunamadı.",
    jobFailed: "Üretim başarısız oldu.",
    errorTitle: "Bir şeyler ters gitti",
    retry: "Tekrar dene",
    title: "Müfredatın hazırlanıyor",
    backgroundNote:
      "Bu sayfa kapansa bile üretim devam eder — geri dönünce kaldığı yerden sürer.",
  },
  en: {
    statusLines: [
      "Reviewing your profile...",
      "Charting a route around your goals...",
      "Decorating the units with your interests...",
      "Preparing your exercises...",
      "Building your grammar map...",
      "Final touches... This can take a while, refresh your tea ☕",
    ],
    jobNotFound: "Generation record not found.",
    jobFailed: "Generation failed.",
    errorTitle: "Something went wrong",
    retry: "Try again",
    title: "Preparing your curriculum",
    backgroundNote:
      "Generation keeps running even if this page closes — it picks up where it left off when you return.",
  },
};

export function GeneratingScreen({
  jobId,
  uiLanguage,
  onDone,
  onRetry,
}: {
  jobId: string;
  uiLanguage?: string;
  onDone: () => void;
  onRetry: () => void;
}) {
  const t = pick(S, uiLanguage);
  const [lineIdx, setLineIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(
      () => setLineIdx((i) => (i + 1) % S.tr.statusLines.length),
      6000
    );
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let stopped = false;
    const t = pick(S, uiLanguage);
    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (res.status === 404) {
          setError(t.jobNotFound);
          return;
        }
        const job = await res.json();
        if (stopped) return;
        if (job.status === "done") return onDone();
        if (job.status === "error") {
          setError(job.error ?? t.jobFailed);
          return;
        }
        setTimeout(poll, 3000);
      } catch {
        if (!stopped) setTimeout(poll, 5000);
      }
    };
    poll();
    return () => {
      stopped = true;
    };
  }, [jobId, onDone, uiLanguage]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">🍂</div>
        <h1 className="text-xl font-semibold">{t.errorTitle}</h1>
        <p className="text-sm text-ink-soft">{error}</p>
        <CozyButton onClick={onRetry}>{t.retry}</CozyButton>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="animate-float-slow text-6xl">☁️</div>
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <p className="min-h-12 text-ink-soft transition-opacity">
        {t.statusLines[lineIdx]}
      </p>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2.5 w-2.5 animate-bounce rounded-full bg-accent"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
      <p className="text-xs text-ink-soft/70">{t.backgroundNote}</p>
    </div>
  );
}
