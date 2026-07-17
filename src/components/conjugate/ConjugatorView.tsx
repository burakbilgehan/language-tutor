"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toHiragana } from "wanakana";
import { conjugatorFor, type JaWordClass } from "@/lib/conjugation";
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
          <div className="grid gap-4 md:grid-cols-2">
            {result.groups.map((g) => (
              <section key={g.id} className="rounded-cozy bg-surface p-4 shadow-cozy">
                <h2 className="mb-2 font-display text-base font-bold">{en ? g.labelEn : g.labelTr}</h2>
                <table className="w-full">
                  <tbody>
                    {g.forms.map((f) => (
                      <tr key={f.id} className="border-t border-ink/5 first:border-t-0">
                        <td className="py-1.5 pr-2 align-baseline">
                          <div className="text-xs text-ink-soft">{en ? f.labelEn : f.labelTr}</div>
                          <div className="text-[0.65rem] text-ink-soft/60" lang="ja">
                            {f.pattern}
                          </div>
                        </td>
                        <td className="py-1.5 text-right align-baseline">
                          <Furigana
                            text={f.furigana}
                            className="font-display text-lg leading-relaxed"
                          />
                          {showRomaji && f.romaji && (
                            <div className="text-xs text-ink-soft">{f.romaji}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
