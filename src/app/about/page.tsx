"use client";

import Link from "next/link";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { useStrings } from "@/lib/i18n/use-strings";
import { useProfileMeta } from "@/lib/use-profile-meta";

const S = {
  tr: {
    title: "Kaynaklar & Lisanslar",
    intro:
      "Uygulama, aşağıdaki açık kaynak veri setlerini ve kütüphaneleri kullanır. Her kaynak kendi lisansı altında, gerekli atıflarla birlikte listelenmiştir.",
    usedFor: "Kullanım alanı",
    license: "Lisans",
    link: "Kaynak",
    backToSettings: "Ayarlara dön",
  },
  en: {
    title: "Sources & Licenses",
    intro:
      "This app uses the following open source data sets and libraries. Each is listed under its own license with the required attribution.",
    usedFor: "Used for",
    license: "License",
    link: "Source",
    backToSettings: "Back to settings",
  },
};

interface Source {
  name: string;
  usedForTr: string;
  usedForEn: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  note?: { tr: string; en: string };
}

const SOURCES: Source[] = [
  {
    name: "JMdict (incl. KANJIDIC2)",
    usedForTr:
      "Japonca kelime seçim balonu (SelectionTooltip) ve kanji arama — okunuş ve İngilizce gloss verisi. KANJIDIC2 ayrıca kanji-data üzerinden JLPT kanji indeksine de katkı sağlar (aşağıya bkz).",
    usedForEn:
      "Japanese selection tooltip (SelectionTooltip) and kanji lookup — reading and English gloss data. KANJIDIC2 also feeds the JLPT kanji index via kanji-data (see below).",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://www.edrdg.org/edrdg/licence.html",
    sourceUrl: "https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project",
    note: {
      tr: "Electronic Dictionary Research and Development Group (EDRDG) tarafından üretilen tüm dosyalar (JMdict, KANJIDIC2 dahil) aynı CC BY-SA 4.0 lisansı altındadır. Bu uygulama, jmdict-simplified aracılığıyla türetilmiş sık kullanılan JMdict girdilerinin bir alt kümesini gömer.",
      en: "All files produced by the Electronic Dictionary Research and Development Group (EDRDG) — including JMdict and KANJIDIC2 — share the same CC BY-SA 4.0 licence. This app embeds a filtered subset of common JMdict entries, derived via jmdict-simplified.",
    },
  },
  {
    name: "kanji-data (davidluzgouveia)",
    usedForTr:
      "JLPT kanji indeksi (N5→N1) — karakterler, on/kun okunuşları, İngilizce anlamlar; KANJIDIC2 ve Tanos JLPT listesini (aşağıya bkz) MIT lisanslı bir araçla JSON'a dönüştürür.",
    usedForEn:
      "JLPT kanji index (N5→N1) — characters, on/kun readings, English meanings; converts KANJIDIC2 and the Tanos JLPT list (see below) into JSON via an MIT-licensed tool.",
    license: "MIT (dönüştürme aracı — alttaki veri kaynakları kendi lisanslarını korur)",
    licenseUrl: "https://github.com/davidluzgouveia/kanji-data",
    sourceUrl: "https://github.com/davidluzgouveia/kanji-data",
  },
  {
    name: "JLPT Resources (Jonathan Waller / tanos.co.uk)",
    usedForTr:
      "JLPT kanji indeksindeki N5→N1 seviye ataması, kanji-data aracılığıyla bu listeden gelir.",
    usedForEn:
      "The N5→N1 level assignment in the JLPT kanji index comes from this list, via kanji-data.",
    license: "CC BY",
    licenseUrl: "http://www.tanos.co.uk/jlpt/",
    sourceUrl: "http://www.tanos.co.uk/jlpt/",
    note: {
      tr: "Tanos listeleri, JLPT'nin 2010'daki 4→5 seviye reformundan öncesine dayanır; bu \"5 seviyeli\" türev N3'ü interpole eder ve modern resmi bölünmeyle birebir örtüşmeyebilir.",
      en: "The Tanos lists predate the JLPT's 2010 four-to-five-level reform; this \"five-level\" derivative interpolates N3 and may not exactly match the modern official split.",
    },
  },
  {
    name: "complete-hsk-vocabulary (drkameleon)",
    usedForTr:
      "HSK 2.0 kelime sözlüğü (HSK1→HSK6) — pinyin, İngilizce gloss ve ölçü sözcükleri (量词).",
    usedForEn:
      "HSK 2.0 vocabulary dictionary (HSK1→HSK6) — pinyin, English glosses and measure words (量词).",
    license: "MIT (liste) / CC BY-SA (CC-CEDICT türevi gloss'lar)",
    licenseUrl: "https://github.com/drkameleon/complete-hsk-vocabulary",
    sourceUrl: "https://github.com/drkameleon/complete-hsk-vocabulary",
    note: {
      tr: "İngilizce gloss'lar CC-CEDICT'ten türetilmiştir (CC BY-SA).",
      en: "English glosses are derived from CC-CEDICT (CC BY-SA).",
    },
  },
  {
    name: "hanzi-writer-data-jp (@k1low)",
    usedForTr:
      "Kanji yazım/çizgi sırası eğitmeni (/stroke) — vuruş verisi. Make Me a Hanzi ve animCJK projelerinden türetilmiştir.",
    usedForEn:
      "Kanji stroke-order trainer (/stroke) — stroke data. Derived from the Make Me a Hanzi and animCJK projects.",
    license: "LGPL / Arphic Public License / Unicode (kaynağa göre değişir)",
    licenseUrl: "https://github.com/k1LoW/hanzi-writer-data-jp",
    sourceUrl: "https://github.com/k1LoW/hanzi-writer-data-jp",
    note: {
      tr: "Farklı karakterler farklı üst-kaynaklardan (Arphic fontları, animCJK, Unihan) gelir; tam lisans metinleri paketin licenses/ klasöründedir.",
      en: "Different characters trace back to different upstream sources (Arphic fonts, animCJK, Unihan); full license texts ship in the package's licenses/ folder.",
    },
  },
  {
    name: "Hanzi Writer",
    usedForTr: "Kanji yazım/çizgi sırası eğitmeninin çizim motoru (kütüphane kodu, veri değil).",
    usedForEn: "The rendering engine behind the stroke-order trainer (library code, not data).",
    license: "MIT",
    licenseUrl: "https://github.com/chanind/hanzi-writer/blob/master/LICENSE",
    sourceUrl: "https://github.com/chanind/hanzi-writer",
  },
];

export default function AboutPage() {
  const t = useStrings(S);
  const profile = useProfileMeta();
  const en = profile?.uiLanguage === "en";

  return (
    <div className="min-h-dvh pb-16">
      <StatsHeader title={t.title} />
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
        <p className="text-sm text-ink-soft">{t.intro}</p>

        <div className="flex flex-col gap-4">
          {SOURCES.map((s) => (
            <section
              key={s.name}
              className="rounded-cozy bg-surface p-5 shadow-cozy"
            >
              <h2 className="font-display text-lg font-bold">{s.name}</h2>
              <p className="mt-1 text-sm text-ink-soft">
                <span className="font-semibold text-ink">{t.usedFor}:</span>{" "}
                {en ? s.usedForEn : s.usedForTr}
              </p>
              {s.note && (
                <p className="mt-1 text-sm text-ink-soft">
                  {en ? s.note.en : s.note.tr}
                </p>
              )}
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-sm">
                <dt className="font-semibold text-ink">{t.license}</dt>
                <dd>
                  <a
                    href={s.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {s.license}
                  </a>
                </dd>
                <dt className="font-semibold text-ink">{t.link}</dt>
                <dd>
                  <a
                    href={s.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all underline"
                  >
                    {s.sourceUrl}
                  </a>
                </dd>
              </dl>
            </section>
          ))}
        </div>

        <Link href="/settings" className="text-sm underline">
          {t.backToSettings}
        </Link>
      </main>
    </div>
  );
}
