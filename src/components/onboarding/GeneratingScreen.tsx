"use client";

import { useEffect, useState } from "react";
import { CozyButton } from "@/components/shared/CozyButton";

const STATUS_LINES = [
  "Profilini inceliyorum...",
  "Hedeflerine uygun bir rota çiziyorum...",
  "Üniteleri ilgi alanlarına göre süslüyorum...",
  "Yan görevleri hazırlıyorum...",
  "Gramer haritanı oluşturuyorum...",
  "Son rötuşlar... Bu biraz sürebilir, çayını tazele ☕",
];

export function GeneratingScreen({
  jobId,
  onDone,
  onRetry,
}: {
  jobId: string;
  onDone: () => void;
  onRetry: () => void;
}) {
  const [lineIdx, setLineIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(
      () => setLineIdx((i) => (i + 1) % STATUS_LINES.length),
      6000
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (res.status === 404) {
          setError("Üretim kaydı bulunamadı.");
          return;
        }
        const job = await res.json();
        if (stopped) return;
        if (job.status === "done") return onDone();
        if (job.status === "error") {
          setError(job.error ?? "Üretim başarısız oldu.");
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
  }, [jobId, onDone]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">🍂</div>
        <h1 className="text-xl font-semibold">Bir şeyler ters gitti</h1>
        <p className="text-sm text-ink-soft">{error}</p>
        <CozyButton onClick={onRetry}>Tekrar dene</CozyButton>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="animate-float-slow text-6xl">☁️</div>
      <h1 className="text-2xl font-semibold">Müfredatın hazırlanıyor</h1>
      <p className="min-h-12 text-ink-soft transition-opacity">
        {STATUS_LINES[lineIdx]}
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
      <p className="text-xs text-ink-soft/70">
        Bu sayfa kapansa bile üretim devam eder — geri dönünce kaldığı yerden
        sürer.
      </p>
    </div>
  );
}
