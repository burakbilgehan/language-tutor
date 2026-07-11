"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CozyButton } from "@/components/shared/CozyButton";
import { StatsHeader } from "@/components/shared/StatsHeader";

interface CardDto {
  id: string;
  itemType: string;
  front: string;
  back: string;
  reading: string | null;
  example: string | null;
}

const RATINGS: { value: 0 | 1 | 2 | 3; label: string; cls: string }[] = [
  { value: 0, label: "Tekrar", cls: "bg-danger/15 hover:bg-danger/25" },
  { value: 1, label: "Zor", cls: "bg-gold/15 hover:bg-gold/25" },
  { value: 2, label: "İyi", cls: "bg-moss-soft hover:brightness-105" },
  { value: 3, label: "Kolay", cls: "bg-accent-soft/50 hover:bg-accent-soft" },
];

export function SrsSession() {
  const router = useRouter();
  const [cards, setCards] = useState<CardDto[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/srs/due")
      .then((r) => r.json())
      .then((d) => setCards(d.cards ?? []));
  }, []);

  const rate = async (rating: 0 | 1 | 2 | 3) => {
    if (!cards || busy) return;
    setBusy(true);
    try {
      await fetch("/api/srs/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: cards[idx].id, rating }),
      });
      setReviewed((n) => n + 1);
      setRevealed(false);
      setIdx((i) => i + 1);
    } finally {
      setBusy(false);
    }
  };

  if (!cards) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-ink-soft">
        Kartlar yükleniyor...
      </div>
    );
  }

  if (cards.length === 0 || idx >= cards.length) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-6xl">{reviewed > 0 ? "🌸" : "🍵"}</div>
        <h1 className="text-2xl font-semibold">
          {reviewed > 0 ? "Tekrar bitti!" : "Şimdilik kart yok"}
        </h1>
        <p className="text-ink-soft">
          {reviewed > 0
            ? `${reviewed} kart gözden geçirdin. Beynin teşekkür ediyor.`
            : "Ders tamamladıkça yeni kelimeler buraya düşecek."}
        </p>
        <CozyButton onClick={() => router.push("/map")}>Haritaya dön</CozyButton>
      </div>
    );
  }

  const card = cards[idx];

  return (
    <div className="min-h-dvh">
      <StatsHeader title="Kelime Tekrarı" backHref="/map" />
      <main className="mx-auto max-w-md px-4 py-10">
        <div className="mb-4 flex justify-center gap-1">
          {cards.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-3 rounded-full ${
                i < idx ? "bg-moss" : i === idx ? "bg-accent" : "bg-surface-2"
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => setRevealed(true)}
          disabled={revealed}
          className="flex min-h-72 w-full flex-col items-center justify-center gap-3 rounded-cozy bg-surface p-8 text-center shadow-cozy transition-transform active:scale-[0.99] cursor-pointer disabled:cursor-default"
        >
          <div lang="ja" className="text-4xl font-semibold">
            {card.front}
          </div>
          {revealed ? (
            <>
              {card.reading && (
                <div className="text-ink-soft">{card.reading}</div>
              )}
              <div className="text-xl font-semibold text-accent">
                {card.back}
              </div>
              {card.example && (
                <div lang="ja" className="text-sm text-ink-soft">
                  {card.example}
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-ink-soft">Görmek için dokun</div>
          )}
        </button>

        {revealed && (
          <div className="mt-6 grid grid-cols-4 gap-2">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                onClick={() => rate(r.value)}
                disabled={busy}
                className={`rounded-xl px-2 py-3 text-sm font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-40 ${r.cls}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
