import Link from "next/link";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { getActiveProfile } from "@/lib/profile";
import { pick } from "@/lib/i18n";
import {
  GOJUON,
  GOJUON_HEADERS,
  DAKUTEN,
  YOON,
  YOON_HEADERS,
  type KanaRow,
} from "@/lib/kana";

export const dynamic = "force-dynamic";

const S = {
  tr: {
    titleShort: "Kana",
    jaOnly: "Kana tablosu Japonca profiline özel.",
    backToMap: "Haritaya dön",
    title: "Kana Tablosu",
    introPre: "Her hücrede solda hiragana, sağda katakana. Çizim pratiği için ",
    introLink: "Yazım sayfası",
    introPost: ".",
    yoon: "Yōon — küçük ゃゅょ birleşimleri",
  },
  en: {
    titleShort: "Kana",
    jaOnly: "The kana table is specific to Japanese profiles.",
    backToMap: "Back to the map",
    title: "Kana Table",
    introPre: "Each cell shows hiragana on the left, katakana on the right. For stroke practice, see the ",
    introLink: "Writing page",
    introPost: ".",
    yoon: "Yōon — small ゃゅょ combinations",
  },
};

function KanaGrid({
  rows,
  headers,
}: {
  rows: KanaRow[];
  headers: string[];
}) {
  return (
    <div className="overflow-x-auto rounded-cozy bg-surface p-4 shadow-cozy">
      <table className="w-full border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="w-8" />
            {headers.map((h) => (
              <th
                key={h}
                className="pb-1 text-center text-xs font-semibold tracking-wider text-accent"
              >
                {/* JS toUpperCase, not CSS uppercase: tr locale turns i into İ */}
                {h.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              <td className="pr-1 text-right text-xs font-semibold tracking-wider text-accent">
                {row.label.toUpperCase()}
              </td>
              {row.cells.map((cell, ci) =>
                cell ? (
                  <td
                    key={ci}
                    className="rounded-xl bg-background px-2 py-2 text-center align-top"
                  >
                    <div className="flex items-baseline justify-center gap-1.5 whitespace-nowrap font-display text-xl leading-tight">
                      <span lang="ja">{cell.hira}</span>
                      <span lang="ja" className="text-ink-soft">
                        {cell.kata}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs font-medium text-ink-soft">
                      {cell.romaji}
                    </div>
                  </td>
                ) : (
                  <td key={ci} />
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function KanaPage() {
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
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <p className="text-sm text-ink-soft">
          {t.introPre}
          <Link href="/stroke" className="font-semibold underline">
            {t.introLink}
          </Link>
          {t.introPost}
        </p>
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-bold">Gojūon</h2>
          <KanaGrid rows={GOJUON} headers={GOJUON_HEADERS} />
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-bold">
            Dakuten ゛ / Handakuten ゜
          </h2>
          <KanaGrid rows={DAKUTEN} headers={GOJUON_HEADERS} />
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg font-bold">{t.yoon}</h2>
          <KanaGrid rows={YOON} headers={YOON_HEADERS} />
        </section>
      </main>
    </div>
  );
}
