"use client";

import { Fragment } from "react";
import { ZH_ASPECT_GROUPS } from "@/lib/conjugation/zh";
import { Furigana } from "@/components/shared/Furigana";
import { SpeakButton } from "@/components/shared/SpeakButton";
import { useStrings } from "@/lib/i18n/use-strings";
import { useProfileMeta } from "@/lib/use-profile-meta";

const S = {
  tr: {
    intro:
      "Çincede fiil çekimi yok: zaman ve görünüş, partikeller ve belirteçlerle kurulur. Cetvel aşağıda.",
    colMarker: "İşaret",
    colMeaning: "Anlam",
    colPattern: "Kalıp",
    colExample: "Örnek",
  },
  en: {
    intro:
      "Chinese verbs don't conjugate: tense and aspect come from particles and adverbs. The chart is below.",
    colMarker: "Marker",
    colMeaning: "Meaning",
    colPattern: "Pattern",
    colExample: "Example",
  },
};

export function ZhAspectView() {
  const t = useStrings(S);
  const en = useProfileMeta()?.uiLanguage === "en";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">{t.intro}</p>
      <div className="overflow-x-auto rounded-cozy bg-surface p-2 shadow-cozy sm:p-4">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {[t.colMarker, t.colMeaning, t.colPattern, t.colExample].map((h) => (
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
            {ZH_ASPECT_GROUPS.map((g) => (
              <Fragment key={g.id}>
                <tr>
                  <td
                    colSpan={4}
                    className="border border-ink/10 bg-accent/10 px-2 py-1.5 font-display text-sm font-bold"
                  >
                    {en ? g.labelEn : g.labelTr}
                  </td>
                </tr>
                {g.rows.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td
                      className="whitespace-nowrap border border-ink/10 px-2 py-1.5 font-display text-lg"
                      lang="zh"
                    >
                      {r.marker}
                    </td>
                    <td className="border border-ink/10 px-2 py-1.5">
                      {en ? r.labelEn : r.labelTr}
                    </td>
                    <td
                      className="whitespace-nowrap border border-ink/10 px-2 py-1.5 text-ink-soft"
                      lang="zh"
                    >
                      {r.pattern}
                    </td>
                    <td className="border border-ink/10 px-2 py-1.5">
                      <div className="flex items-start gap-1">
                        <Furigana text={r.exZh} className="leading-relaxed" />
                        <SpeakButton text={r.exZh} lang="zh-CN" />
                      </div>
                      <div className="text-xs text-ink-soft">
                        {en ? r.exEn : r.exTr}
                      </div>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
