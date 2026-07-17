"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { toHiragana } from "wanakana";
import { conjugatorFor, type JaWordClass } from "@/lib/conjugation";
import { JA_CHART_GROUPS } from "@/lib/conjugation/ja-charts";
import { SpeakButton } from "@/components/shared/SpeakButton";
import { Furigana } from "@/components/shared/Furigana";
import { useStrings } from "@/lib/i18n/use-strings";
import { useProfileMeta } from "@/lib/use-profile-meta";

const S = {
  tr: {
    inputLabel: "Kelime (romaji / kana / kanji)",
    inputPlaceholder: "taberu, たべる, 食べる…",
    readingLabel: "Okunuş (kana)",
    readingPlaceholder: "たべる",
    classLabel: "Sınıf",
    romaji: "Romaji",
    presets: "Örnekler",
    empty: "Bir kelime yaz ya da yukarıdan bir örnek seç.",
    colForm: "Form",
    colRule: "Kural",
    colResult: "Sonuç",
    colExample: "Örnek",
  },
  en: {
    inputLabel: "Word (romaji / kana / kanji)",
    inputPlaceholder: "taberu, たべる, 食べる…",
    readingLabel: "Reading (kana)",
    readingPlaceholder: "たべる",
    classLabel: "Class",
    romaji: "Romaji",
    presets: "Presets",
    empty: "Type a word or pick a preset above.",
    colForm: "Form",
    colRule: "Rule",
    colResult: "Result",
    colExample: "Example",
  },
};

const KANJI_RE = /[一-鿿々]/;

export function ConjugatorView({ targetLanguage }: { targetLanguage: string }) {
  const t = useStrings(S);
  const en = useProfileMeta()?.uiLanguage === "en";
  const conj = conjugatorFor(targetLanguage);

  const [rawInput, setRawInput] = useState("");
  const [reading, setReading] = useState("");
  const [readingTouched, setReadingTouched] = useState(false);
  const [userClass, setUserClass] = useState<JaWordClass | null>(null);
  const [showRomaji, setShowRomaji] = useState(true);
  // The word the last lookup ran for, so we don't refetch on every keystroke.
  const lookedUpFor = useRef<string>("");

  const surface = useMemo(
    () => toHiragana(rawInput.trim(), { passRomaji: false }),
    [rawInput]
  );
  const kanaReading = useMemo(
    () => toHiragana(reading.trim(), { passRomaji: false }),
    [reading]
  );
  const hasKanji = KANJI_RE.test(surface);

  // Pre-fill the reading from JMdict when a kanji word is entered and the
  // user hasn't typed their own reading.
  useEffect(() => {
    if (!hasKanji || readingTouched || !surface || surface === lookedUpFor.current) return;
    const timer = setTimeout(() => {
      lookedUpFor.current = surface;
      fetch(`/api/kanji/lookup?text=${encodeURIComponent(surface)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.word?.reading && !readingTouched) {
            setReading(data.word.reading);
          }
        })
        .catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [surface, hasKanji, readingTouched]);

  const guessed = useMemo(() => {
    if (!conj || !surface) return null;
    return conj.guessClass(kanaReading || surface) as JaWordClass | null;
  }, [conj, surface, kanaReading]);
  const wordClass = userClass ?? guessed;

  const result = useMemo(() => {
    if (!conj || !surface || !wordClass) return null;
    return conj.conjugate({
      surface,
      reading: hasKanji ? kanaReading || undefined : undefined,
      wordClass,
    });
  }, [conj, surface, kanaReading, hasKanji, wordClass]);

  if (!conj) return null;

  const applyPreset = (p: (typeof conj.presets)[number]) => {
    setRawInput(p.surface);
    setReading(p.reading);
    setReadingTouched(true);
    setUserClass(p.wordClass as JaWordClass);
    lookedUpFor.current = p.surface;
  };

  // Ruler column: shared prefix stripped, e.g. かく→かきます renders 〜く → 〜きます.
  // Kana is used when known so kanji spelling doesn't hide the sound change.
  const dictBase = (hasKanji ? kanaReading : "") || surface;
  const ruleFor = (formKana: string | null, formSurface: string) => {
    const to = formKana ?? formSurface;
    if (!dictBase || dictBase === to) return "—";
    let p = 0;
    while (p < dictBase.length && p < to.length && dictBase[p] === to[p]) p++;
    if (p === 0) return `${dictBase} → ${to}`;
    return `〜${dictBase.slice(p)} → 〜${to.slice(p)}`;
  };

  const onInputChange = (v: string) => {
    setRawInput(v);
    setReadingTouched(false);
    setReading("");
    setUserClass(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-cozy bg-surface p-4 shadow-cozy">
        <div className="mb-1 text-xs font-semibold tracking-wider text-accent">
          {t.presets.toUpperCase()}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {conj.presets.map((p) => (
            <button
              key={p.surface + p.wordClass}
              type="button"
              title={en ? p.hintEn : p.hintTr}
              onClick={() => applyPreset(p)}
              className={`rounded-full px-2.5 py-1 text-sm transition-colors ${
                rawInput === p.surface
                  ? "bg-accent text-white"
                  : "bg-background hover:bg-accent/10"
              }`}
              lang="ja"
            >
              {p.surface}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-cozy bg-surface p-4 shadow-cozy">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-xs font-semibold tracking-wider text-accent">
              {t.inputLabel.toUpperCase()}
            </span>
            <input
              value={rawInput}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={t.inputPlaceholder}
              className="rounded-xl border border-ink/10 bg-background px-3 py-2 font-display text-lg outline-none focus:border-accent"
              lang="ja"
            />
          </label>
          {hasKanji && (
            <label className="flex flex-col gap-1 sm:w-44">
              <span className="text-xs font-semibold tracking-wider text-accent">
                {t.readingLabel.toUpperCase()}
              </span>
              <input
                value={reading}
                onChange={(e) => {
                  setReading(e.target.value);
                  setReadingTouched(true);
                }}
                placeholder={t.readingPlaceholder}
                className="rounded-xl border border-ink/10 bg-background px-3 py-2 font-display text-lg outline-none focus:border-accent"
                lang="ja"
              />
            </label>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-xs font-semibold tracking-wider text-accent">
            {t.classLabel.toUpperCase()}
          </span>
          {conj.wordClasses.map((wc) => (
            <label key={wc.id} className="flex cursor-pointer items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="word-class"
                checked={wordClass === wc.id}
                onChange={() => setUserClass(wc.id as JaWordClass)}
                className="accent-[var(--color-accent)]"
              />
              {en ? wc.labelEn : wc.labelTr}
            </label>
          ))}
          <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={showRomaji}
              onChange={(e) => setShowRomaji(e.target.checked)}
              className="accent-[var(--color-accent)]"
            />
            {t.romaji}
          </label>
        </div>
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
                          <div>{en ? f.labelEn : f.labelTr}</div>
                          <div className="text-[0.65rem] text-ink-soft/70" lang="ja">
                            {f.pattern}
                          </div>
                        </td>
                        <td
                          className="whitespace-nowrap border border-ink/10 px-2 py-1.5 text-ink-soft"
                          lang="ja"
                        >
                          {ruleFor(f.kana, f.surface)}
                        </td>
                        <td className="border border-ink/10 px-2 py-1.5">
                          <Furigana
                            text={f.furigana}
                            className="font-display text-base leading-relaxed"
                          />
                          {showRomaji && f.romaji && (
                            <div className="text-xs text-ink-soft">{f.romaji}</div>
                          )}
                        </td>
                        <td className="border border-ink/10 px-2 py-1.5">
                          {f.example && (
                            <>
                              <Furigana
                                text={f.example.ja}
                                className="leading-relaxed"
                              />
                              <div className="text-xs text-ink-soft">
                                {en ? f.example.en : f.example.tr}
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

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-bold">
          {en ? "Reference charts" : "Cetveller"}
        </h2>
        {JA_CHART_GROUPS.map((g) => (
          <div key={g.id} className="overflow-x-auto rounded-cozy bg-surface p-2 shadow-cozy sm:p-4">
            <div className="mb-1 px-1 font-display text-sm font-bold">
              {en ? g.labelEn : g.labelTr}
            </div>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {(en ? g.headersEn : g.headersTr).map((h) => (
                    <th key={h} className="border border-ink/10 bg-background px-2 py-1.5 text-left text-xs font-semibold tracking-wider text-accent">
                      {h.toUpperCase()}
                    </th>
                  ))}
                  <th className="border border-ink/10 bg-background px-2 py-1.5 text-left text-xs font-semibold tracking-wider text-accent">
                    {en ? "NOTE" : "NOT"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r, ri) => (
                  <tr key={ri} className="align-top">
                    {r.cells.map((c, ci) => (
                      <td key={ci} className="border border-ink/10 px-2 py-1.5 font-display">
                        <Furigana text={c} />
                        {g.id !== "kosoado" && ci === r.cells.length - 1 && (
                          <SpeakButton text={c} lang="ja-JP" />
                        )}
                      </td>
                    ))}
                    <td className="border border-ink/10 px-2 py-1.5 text-xs text-ink-soft">
                      {en ? r.noteEn : r.noteTr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </section>
    </div>
  );
}
