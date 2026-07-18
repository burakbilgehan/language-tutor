"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { StrokeTrainer } from "@/components/stroke/StrokeTrainer";
import { useProfileMeta } from "@/lib/use-profile-meta";
import { useStrings } from "@/lib/i18n/use-strings";

const S = {
  tr: {
    titleShort: "Yazım",
    jaOnly: "Çizim pratiği Japonca profiline özel.",
    backToMap: "Haritaya dön",
    title: "Yazım Pratiği",
  },
  en: {
    titleShort: "Writing",
    jaOnly: "Stroke practice is specific to Japanese profiles.",
    backToMap: "Back to the map",
    title: "Writing Practice",
  },
};

function StrokePageInner() {
  const meta = useProfileMeta();
  const t = useStrings(S);
  const initialChar = useSearchParams().get("char") ?? undefined;
  if (meta && meta.targetLanguage !== "ja") {
    return (
      <div className="min-h-dvh pb-16">
        <StatsHeader title={t.titleShort} />
        <div className="flex flex-col items-center gap-3 py-24 text-center text-ink-soft">
          <div className="text-4xl">🌿</div>
          <p>{t.jaOnly}</p>
          <Link href="/map" className="underline">
            {t.backToMap}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-16">
      <StatsHeader title={t.title} />
      <StrokeTrainer initialChar={initialChar} />
    </div>
  );
}

// Deep-link support: /stroke?char=<kanji> opens that kanji directly (from the
// cmd+K search palette). useSearchParams needs a Suspense boundary in static
// export.
export default function StrokePage() {
  return (
    <Suspense fallback={null}>
      <StrokePageInner />
    </Suspense>
  );
}
