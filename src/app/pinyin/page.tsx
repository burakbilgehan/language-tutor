import Link from "next/link";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { Furigana } from "@/components/shared/Furigana";
import { SpeakButton } from "@/components/shared/SpeakButton";
import { getActiveProfile } from "@/lib/profile";
import { pick } from "@/lib/i18n";
import {
  TONES,
  INITIALS,
  FINALS,
  PINYIN_NOTES,
  type PinyinRow,
} from "@/lib/zh-pinyin";

export const dynamic = "force-dynamic";

const S = {
  tr: {
    title: "Pinyin Tablosu",
    titleShort: "Pinyin",
    zhOnly: "Pinyin tablosu Çince profiline özel.",
    backToMap: "Haritaya dön",
    intro:
      "Pinyin, hanzi okunuşlarının Latin yazımı. Ton işareti heceyi tamamen değiştirir — önce tonları içselleştir.",
    tones: "Tonlar",
    initials: "Ünsüzler (şeteller)",
    finals: "Ünlüler ve hece sonları",
    colSymbol: "Sembol",
    colExample: "Örnek",
    colHint: "Yaklaşık ses",
  },
  en: {
    title: "Pinyin Chart",
    titleShort: "Pinyin",
    zhOnly: "The pinyin chart is specific to Chinese profiles.",
    backToMap: "Back to the map",
    intro:
      "Pinyin is the Latin spelling of hanzi readings. The tone mark changes the syllable entirely — internalize tones first.",
    tones: "Tones",
    initials: "Initials",
    finals: "Finals",
    colSymbol: "Symbol",
    colExample: "Example",
    colHint: "Approximate sound",
  },
};

function PinyinTable({
  rows,
  headers,
  en,
}: {
  rows: PinyinRow[];
  headers: [string, string, string];
  en: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-cozy bg-surface p-2 shadow-cozy sm:p-4">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="border border-ink/10 bg-background px-2 py-1.5 text-left text-xs font-semibold tracking-wider text-accent"
              >
                {h.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.symbol} className="align-top">
              <td className="whitespace-nowrap border border-ink/10 px-2 py-1.5 font-display text-base">
                {r.symbol}
              </td>
              <td className="whitespace-nowrap border border-ink/10 px-2 py-1.5 font-display text-lg">
                <Furigana text={r.exampleZh} />
                <SpeakButton text={r.exampleZh} lang="zh-CN" />
              </td>
              <td className="border border-ink/10 px-2 py-1.5 text-ink-soft">
                {en ? r.hintEn : r.hintTr}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PinyinPage() {
  const profile = getActiveProfile();
  const t = pick(S, profile?.uiLanguage);
  const en = profile?.uiLanguage === "en";
  if (profile && profile.targetLanguage !== "zh") {
    return (
      <div className="min-h-dvh pb-16">
        <StatsHeader title={t.titleShort} />
        <div className="flex flex-col items-center gap-3 py-24 text-center text-ink-soft">
          <div className="text-4xl">🌿</div>
          <p>{t.zhOnly}</p>
          <Link href="/map" className="underline">
            {t.backToMap}
          </Link>
        </div>
      </div>
    );
  }

  const headers: [string, string, string] = [t.colSymbol, t.colExample, t.colHint];
  return (
    <div className="min-h-dvh pb-16">
      <StatsHeader title={t.title} />
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <p className="text-sm text-ink-soft">{t.intro}</p>
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-bold">{t.tones}</h2>
          <PinyinTable rows={TONES} headers={headers} en={en} />
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-bold">{t.initials}</h2>
          <PinyinTable rows={INITIALS} headers={headers} en={en} />
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-bold">{t.finals}</h2>
          <PinyinTable rows={FINALS} headers={headers} en={en} />
        </section>
        <div className="flex flex-col gap-1">
          {PINYIN_NOTES.map((n, i) => (
            <p key={i} className="text-xs text-ink-soft">
              ※ {en ? n.en : n.tr}
            </p>
          ))}
        </div>
      </main>
    </div>
  );
}
