import { StatsHeader } from "@/components/shared/StatsHeader";
import { ConjugatorView } from "@/components/conjugate/ConjugatorView";
import { NlConjugatorView } from "@/components/conjugate/NlConjugatorView";
import { ZhAspectView } from "@/components/conjugate/ZhAspectView";
import { getActiveProfile } from "@/lib/profile";
import { pick } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const S = {
  tr: {
    title: "Çekim Cetveli",
    titleZh: "Zaman & Görünüş Cetveli",
    introJa:
      "Bir kök gir (romaji, kana veya kanji), sınıfını seç; tüm çekimler kural sütunuyla birlikte anında türetilir.",
    introNl:
      "Bir mastar gir; zayıf fiiller kuralla, kuvvetli/düzensizler tablo ile çekimlenir.",
  },
  en: {
    title: "Conjugation Tables",
    titleZh: "Tense & Aspect Chart",
    introJa:
      "Enter a stem (romaji, kana or kanji) and pick its class; every form is derived instantly with its rule.",
    introNl:
      "Enter an infinitive; weak verbs conjugate by rule, strong/irregular ones from the table.",
  },
};

export default function ConjugatePage() {
  const profile = getActiveProfile();
  const t = pick(S, profile?.uiLanguage);
  const lang = profile?.targetLanguage ?? "ja";

  return (
    <div className="min-h-dvh pb-16">
      <StatsHeader title={lang === "zh" ? t.titleZh : t.title} />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        {lang === "ja" && (
          <>
            <p className="text-sm text-ink-soft">{t.introJa}</p>
            <ConjugatorView targetLanguage={lang} />
          </>
        )}
        {lang === "zh" && <ZhAspectView />}
        {lang === "nl" && (
          <>
            <p className="text-sm text-ink-soft">{t.introNl}</p>
            <NlConjugatorView />
          </>
        )}
      </main>
    </div>
  );
}
