import Link from "next/link";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { ConjugatorView } from "@/components/conjugate/ConjugatorView";
import { getActiveProfile } from "@/lib/profile";
import { pick } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const S = {
  tr: {
    title: "Çekim Cetveli",
    titleShort: "Çekim",
    jaOnly: "Çekim cetveli şimdilik Japonca profiline özel.",
    backToMap: "Haritaya dön",
    intro:
      "Bir kök gir (romaji, kana veya kanji), sınıfını seç; tüm çekimler anında türetilir. Örnek çipleri her ses değişimi tipini kapsar.",
  },
  en: {
    title: "Conjugation Tables",
    titleShort: "Conjugate",
    jaOnly: "The conjugation tables are Japanese-only for now.",
    backToMap: "Back to the map",
    intro:
      "Enter a stem (romaji, kana or kanji) and pick its class; every form is derived instantly. The preset chips cover each sound-change type.",
  },
};

export default function ConjugatePage() {
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
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
        <p className="text-sm text-ink-soft">{t.intro}</p>
        <ConjugatorView targetLanguage={profile?.targetLanguage ?? "ja"} />
      </main>
    </div>
  );
}
