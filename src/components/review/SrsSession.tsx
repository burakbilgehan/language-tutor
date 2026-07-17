"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CozyButton } from "@/components/shared/CozyButton";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { Furigana } from "@/components/shared/Furigana";
import { useStrings } from "@/lib/i18n/use-strings";
import { srsDue, srsReview } from "@/lib/client-api";

const S = {
  tr: {
    ratingLabels: ["Tekrar", "Zor", "İyi", "Kolay"],
    loading: "Kartlar yükleniyor...",
    doneTitle: "Tekrar bitti!",
    emptyTitle: "Şimdilik kart yok",
    doneBody: (n: number) =>
      `${n} kart gözden geçirdin. Beynin teşekkür ediyor.`,
    emptyBody: "Ders tamamladıkça yeni kelimeler buraya düşecek.",
    backToMap: "Haritaya dön",
    headerTitle: "Kelime Tekrarı",
    tapToReveal: "Görmek için dokun",
  },
  en: {
    ratingLabels: ["Again", "Hard", "Good", "Easy"],
    loading: "Loading cards...",
    doneTitle: "Review done!",
    emptyTitle: "No cards for now",
    doneBody: (n: number) => `You reviewed ${n} cards. Your brain thanks you.`,
    emptyBody: "New words will land here as you complete lessons.",
    backToMap: "Back to map",
    headerTitle: "Vocabulary Review",
    tapToReveal: "Tap to reveal",
  },
};

interface CardDto {
  id: string;
  itemType: string;
  front: string;
  back: string;
  reading: string | null;
  example: string | null;
}

const RATINGS: { value: 0 | 1 | 2 | 3; cls: string }[] = [
  { value: 0, cls: "bg-danger/15 hover:bg-danger/25" },
  { value: 1, cls: "bg-gold/15 hover:bg-gold/25" },
  { value: 2, cls: "bg-moss-soft hover:brightness-105" },
  { value: 3, cls: "bg-accent-soft/50 hover:bg-accent-soft" },
];

export function SrsSession() {
  const t = useStrings(S);
  const router = useRouter();
  const [cards, setCards] = useState<CardDto[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    srsDue()
      .then((d) => setCards(d.cards ?? []))
      .catch((err) => {
        console.error("[srs] due yüklenemedi:", err);
        setCards([]);
      });
  }, []);

  const rate = async (rating: 0 | 1 | 2 | 3) => {
    if (!cards || busy) return;
    setBusy(true);
    try {
      await srsReview(cards[idx].id, rating);
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
        {t.loading}
      </div>
    );
  }

  if (cards.length === 0 || idx >= cards.length) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-6xl">{reviewed > 0 ? "🌸" : "🍵"}</div>
        <h1 className="text-2xl font-semibold">
          {reviewed > 0 ? t.doneTitle : t.emptyTitle}
        </h1>
        <p className="text-ink-soft">
          {reviewed > 0 ? t.doneBody(reviewed) : t.emptyBody}
        </p>
        <CozyButton onClick={() => router.push("/map")}>{t.backToMap}</CozyButton>
      </div>
    );
  }

  const card = cards[idx];

  return (
    <div className="min-h-dvh">
      <StatsHeader title={t.headerTitle} />
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
          <div className="text-4xl font-semibold">
            <Furigana text={card.front} />
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
            <div className="text-sm text-ink-soft">{t.tapToReveal}</div>
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
                {t.ratingLabels[r.value]}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
