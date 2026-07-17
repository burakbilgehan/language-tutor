import Link from "next/link";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { StrokeTrainer } from "@/components/stroke/StrokeTrainer";
import { getActiveProfile } from "@/lib/profile";
import { pick } from "@/lib/i18n";

export const dynamic = "force-dynamic";

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

export default function StrokePage() {
  const profile = getActiveProfile();
  const t = pick(S, profile?.uiLanguage);
  if (profile && profile.targetLanguage !== "ja") {
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
      <StrokeTrainer />
    </div>
  );
}
