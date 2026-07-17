"use client";

import { Fragment, useMemo, useState } from "react";
import { conjugateNl, NL_PRESETS, NL_PATTERN_GROUPS } from "@/lib/conjugation/nl";
import { SpeakButton } from "@/components/shared/SpeakButton";
import { useStrings } from "@/lib/i18n/use-strings";
import { useProfileMeta } from "@/lib/use-profile-meta";

const S = {
  tr: {
    inputLabel: "Fiil (mastar)",
    inputPlaceholder: "werken, lopen, opstaan…",
    presets: "Örnekler",
    empty: "Bir mastar yaz ya da yukarıdan bir örnek seç.",
    colForm: "Form",
    colRule: "Kural",
    colResult: "Sonuç",
    colExample: "Örnek",
    type: { zwak: "zayıf (düzenli)", sterk: "kuvvetli", onregelmatig: "düzensiz" },
  },
  en: {
    inputLabel: "Verb (infinitive)",
    inputPlaceholder: "werken, lopen, opstaan…",
    presets: "Presets",
    empty: "Type an infinitive or pick a preset above.",
    colForm: "Form",
    colRule: "Rule",
    colResult: "Result",
    colExample: "Example",
    type: { zwak: "weak (regular)", sterk: "strong", onregelmatig: "irregular" },
  },
};

export function NlConjugatorView() {
  const t = useStrings(S);
  const en = useProfileMeta()?.uiLanguage === "en";
  const [input, setInput] = useState("");

  const result = useMemo(
    () => (input.trim() ? conjugateNl({ infinitive: input }) : null),
    [input]
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-cozy bg-surface p-4 shadow-cozy">
        <div className="mb-1 text-xs font-semibold tracking-wider text-accent">
          {t.presets.toUpperCase()}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {NL_PRESETS.map((p) => (
            <button
              key={p.infinitive}
              type="button"
              title={en ? p.hintEn : p.hintTr}
              onClick={() => setInput(p.infinitive)}
              className={`rounded-full px-2.5 py-1 text-sm transition-colors ${
                input === p.infinitive
                  ? "bg-accent text-white"
                  : "bg-background hover:bg-accent/10"
              }`}
              lang="nl"
            >
              {p.infinitive}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-cozy bg-surface p-4 shadow-cozy">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-wider text-accent">
            {t.inputLabel.toUpperCase()}
          </span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.inputPlaceholder}
            className="rounded-xl border border-ink/10 bg-background px-3 py-2 font-display text-lg outline-none focus:border-accent"
            lang="nl"
          />
        </label>
        {result?.ok && (
          <div className="mt-2 text-xs text-ink-soft">
            {t.type[result.verbType]}
          </div>
        )}
      </section>

      {!result && <p className="text-center text-sm text-ink-soft">{t.empty}</p>}

      {result && !result.ok && (
        <p className="rounded-cozy bg-surface p-4 text-center text-sm text-ink-soft shadow-cozy">
          {en ? result.errorEn : result.errorTr}
        </p>
      )}

      {result?.ok && (
        <>
          {result.notes.length > 0 && (
            <div className="flex flex-col gap-1">
              {result.notes.map((n, i) => (
                <p key={i} className="text-xs text-ink-soft">
                  ※ {en ? n.en : n.tr}
                </p>
              ))}
            </div>
          )}
          <div className="overflow-x-auto rounded-cozy bg-surface p-2 shadow-cozy sm:p-4">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {[t.colForm, t.colRule, t.colResult, t.colExample].map((h) => (
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
                {result.groups.map((g) => (
                  <Fragment key={g.id}>
                    <tr>
                      <td
                        colSpan={4}
                        className="border border-ink/10 bg-accent/10 px-2 py-1.5 font-display text-sm font-bold"
                      >
                        {en ? g.labelEn : g.labelTr}
                      </td>
                    </tr>
                    {g.forms.map((f) => (
                      <tr key={f.id} className="align-top">
                        <td className="border border-ink/10 px-2 py-1.5">
                          {en ? f.labelEn : f.labelTr}
                        </td>
                        <td className="whitespace-nowrap border border-ink/10 px-2 py-1.5 text-ink-soft">
                          {f.pattern}
                        </td>
                        <td
                          className="border border-ink/10 px-2 py-1.5 font-display text-base"
                          lang="nl"
                        >
                          {f.value}
                        </td>
                        <td className="border border-ink/10 px-2 py-1.5">
                          {f.exNl && (
                            <>
                              <span lang="nl">{f.exNl}</span>
                              <SpeakButton text={f.exNl} lang="nl-NL" />
                              <div className="text-xs text-ink-soft">
                                {en ? f.exEn : f.exTr}
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg font-bold">
          {en ? "Patterns" : "Kalıplar"}
        </h2>
        <div className="overflow-x-auto rounded-cozy bg-surface p-2 shadow-cozy sm:p-4">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {[en ? "Marker" : "İşaret", en ? "Meaning" : "Anlam", en ? "Pattern" : "Kalıp", en ? "Example" : "Örnek"].map((h) => (
                  <th key={h} className="border border-ink/10 bg-background px-2 py-1.5 text-left text-xs font-semibold tracking-wider text-accent">
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NL_PATTERN_GROUPS.map((g) => (
                <Fragment key={g.id}>
                  <tr>
                    <td colSpan={4} className="border border-ink/10 bg-accent/10 px-2 py-1.5 font-display text-sm font-bold">
                      {en ? g.labelEn : g.labelTr}
                    </td>
                  </tr>
                  {g.rows.map((r) => (
                    <tr key={r.id} className="align-top">
                      <td className="whitespace-nowrap border border-ink/10 px-2 py-1.5 font-display" lang="nl">{r.marker}</td>
                      <td className="border border-ink/10 px-2 py-1.5">{en ? r.labelEn : r.labelTr}</td>
                      <td className="border border-ink/10 px-2 py-1.5 text-ink-soft" lang="nl">{r.pattern}</td>
                      <td className="border border-ink/10 px-2 py-1.5">
                        <span lang="nl">{r.exNl}</span>
                        <SpeakButton text={r.exNl} lang="nl-NL" />
                        <div className="text-xs text-ink-soft">{en ? r.exEn : r.exTr}</div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
