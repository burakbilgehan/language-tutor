"use client";

import { useEffect, useState } from "react";
import { CozyButton } from "@/components/shared/CozyButton";
import { useStrings } from "@/lib/i18n/use-strings";
import { useLocalizeError } from "@/lib/i18n/use-localize-error";
import { AppError } from "@/lib/errors";
import { withBase } from "@/lib/base-path";
import { schemeFor, levelDisplay } from "@/lib/curriculum/levels";
import {
  profileData,
  roadmap,
  curriculumDelete,
  curriculumGenerate,
} from "@/lib/client-api";
import type { CurriculumDeletionCounts } from "@/core/curriculum-delete";

// T-082. Throwing a curriculum away and building a new one, optionally starting
// from a level other than the scheme's first.
//
// Two guards, because this is the single most destructive action in the app
// that is not a save import:
//   1. the button only ARMS the flow; it never deletes
//   2. the armed panel spells out what dies and what survives, and the delete
//      stays disabled until the user types the confirmation word
//
// Colour discipline: vermilion (`primary`) is reserved for the one dominant
// action per page, which in Settings it is not. The destructive control is a
// `soft` button with danger text and a danger-tinted panel, the same idiom
// PromptCustomizer uses for its error state.

const S = {
  tr: {
    title: "Müfredat",
    desc:
      "Müfredatın kötü çıktıysa tamamen silip yeniden ürettirebilirsin. Silme yalnızca müfredatı ve önbellekli dersleri kapsar.",
    deleteButton: "🗑️ Müfredatı sil ve yeniden üret",
    cancel: "Vazgeç",
    armedTitle: "Emin misin?",
    lossTitle: "Silinecek:",
    lossItems: [
      "müfredatın tamamı (bölümler, üniteler, dersler)",
      "önbellekteki ders içerikleri ve alıştırmaları",
      "bu alıştırmalara verdiğin cevapların geçmişi",
    ],
    keepTitle: "Korunacak:",
    keepItems: [
      "XP'in ve seri sayacın",
      "tekrar kartların (SRS) ve gramer/kanji/sözlük kütüphanen",
      "profilin ve düzenlediğin müfredat promptu",
    ],
    typeToConfirm: (word: string) => `Onaylamak için "${word}" yaz:`,
    confirmWord: "SIL",
    startLevel: "Yeni müfredat hangi seviyeden başlasın?",
    startLevelHint:
      "Seçtiğin seviyeden öncesi hiç üretilmez. Üstteki seviyeler sen ilerledikçe eklenir.",
    confirmDelete: "Sil ve yeniden üret",
    deleting: "Siliniyor...",
    generating: "Yeni müfredat üretiliyor... Bu birkaç dakika sürebilir.",
    doneTitle: "Müfredat silindi",
    doneCounts: (c: CurriculumDeletionCounts) =>
      `${c.nodes} ders, ${c.units} ünite, ${c.chapters} bölüm silindi.`,
    goMap: "Haritaya git",
    failed: "İşlem tamamlanamadı",
    noCurriculum: "Silinecek bir müfredat yok.",
  },
  en: {
    title: "Curriculum",
    desc:
      "If your curriculum turned out badly, you can delete it entirely and have a new one generated. The delete covers the curriculum and cached lessons only.",
    deleteButton: "🗑️ Delete and regenerate the curriculum",
    cancel: "Cancel",
    armedTitle: "Are you sure?",
    lossTitle: "Will be deleted:",
    lossItems: [
      "the entire curriculum (chapters, units, lessons)",
      "cached lesson content and its exercises",
      "your answer history for those exercises",
    ],
    keepTitle: "Will be kept:",
    keepItems: [
      "your XP and streak",
      "your review cards (SRS) and grammar/kanji/dictionary library",
      "your profile and your edited curriculum prompt",
    ],
    typeToConfirm: (word: string) => `Type "${word}" to confirm:`,
    confirmWord: "DELETE",
    startLevel: "Which level should the new curriculum start from?",
    startLevelHint:
      "Nothing below the level you pick is ever generated. Higher levels are added as you progress.",
    confirmDelete: "Delete and regenerate",
    deleting: "Deleting...",
    generating: "Generating the new curriculum... This can take a few minutes.",
    doneTitle: "Curriculum deleted",
    doneCounts: (c: CurriculumDeletionCounts) =>
      `Deleted ${c.nodes} lessons, ${c.units} units, ${c.chapters} chapters.`,
    goMap: "Go to the map",
    failed: "Could not complete the operation",
    noCurriculum: "There is no curriculum to delete.",
  },
};

type Phase = "idle" | "armed" | "deleting" | "generating" | "done";

export function CurriculumSection() {
  const t = useStrings(S);
  const localize = useLocalizeError();
  const [profile, setProfile] = useState<{
    id: string;
    targetLanguage: string;
  } | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [typed, setTyped] = useState("");
  const [level, setLevel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<CurriculumDeletionCounts | null>(null);
  // Null while unknown; false when there is nothing to delete, so the panel
  // offers an explanation instead of a button that can only fail with
  // `curriculum_missing`.
  const [hasCurriculum, setHasCurriculum] = useState<boolean | null>(null);

  useEffect(() => {
    profileData()
      .then((d) => {
        if (!d?.profile) return;
        setProfile({
          id: d.profile.id,
          targetLanguage: d.profile.targetLanguage,
        });
        // Levels come from the profile's own scheme (JLPT/HSK/CEFR) in data
        // order; nothing here hardcodes a scale.
        setLevel(schemeFor(d.profile.targetLanguage).levels[0]);
      })
      .catch(() => {});
    // getRoadmap returns null when there is no curriculum (or it isn't ready),
    // which is exactly the "nothing to delete" condition; it throws
    // curriculum_not_ready through the client seam.
    roadmap()
      .then(() => setHasCurriculum(true))
      .catch(() => setHasCurriculum(false));
  }, []);

  if (!profile) return null;
  const levels = schemeFor(profile.targetLanguage).levels;

  const run = async () => {
    setError(null);
    setPhase("deleting");
    try {
      const res = await curriculumDelete(profile.id);
      setDeleted(res.deleted);
      // Generation is a separate step on purpose: if it fails (no LLM, bad
      // provider) the delete still stands and the user is told so, rather than
      // the whole action appearing to have done nothing.
      setPhase("generating");
      const gen = await curriculumGenerate(profile.id, level);
      if (gen.jobId) {
        // Server mode: the chapter job runs in the background and the map's
        // own not-ready poller picks it up, exactly as it does after
        // onboarding. Nothing to wait for here.
        window.location.href = withBase("/map");
        return;
      }
      // Static mode: generation ran inline and is finished.
      window.location.href = withBase("/map");
    } catch (e) {
      setError(e instanceof AppError ? localize(e) : t.failed);
      // A failure AFTER the delete leaves no curriculum; say so and offer the
      // map, where the ordinary "generate" card takes over.
      setPhase(deleted ? "done" : "idle");
    }
  };

  return (
    <section className="rounded-cozy bg-surface p-6 shadow-cozy">
      <h2 className="mb-1 font-semibold">{t.title}</h2>
      <p className="mb-3 text-sm text-ink-soft">{t.desc}</p>

      {phase === "idle" &&
        (hasCurriculum === false ? (
          <p className="text-sm text-ink-soft">{t.noCurriculum}</p>
        ) : (
          <CozyButton
            variant="soft"
            className="text-danger"
            disabled={hasCurriculum === null}
            onClick={() => {
              setTyped("");
              setError(null);
              setPhase("armed");
            }}
          >
            {t.deleteButton}
          </CozyButton>
        ))}

      {phase === "armed" && (
        <div className="rounded-xl border-2 border-danger/40 bg-danger/5 px-4 py-4">
          <div className="font-semibold text-danger">{t.armedTitle}</div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs font-semibold text-danger">
                {t.lossTitle}
              </div>
              <ul className="mt-1 list-disc pl-5 text-sm text-ink-soft">
                {t.lossItems.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold text-indigo">
                {t.keepTitle}
              </div>
              <ul className="mt-1 list-disc pl-5 text-sm text-ink-soft">
                {t.keepItems.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="t082-level">
              {t.startLevel}
            </label>
            <p className="mb-2 text-xs text-ink-soft">{t.startLevelHint}</p>
            <select
              id="t082-level"
              value={level ?? levels[0]}
              onChange={(e) => setLevel(e.target.value)}
              className="rounded-xl border-2 border-surface-2 bg-background px-3 py-2 text-sm"
            >
              {levels.map((l) => (
                <option key={l} value={l}>
                  {levelDisplay(profile.targetLanguage, l)}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4">
            <label className="text-sm font-semibold" htmlFor="t082-confirm">
              {t.typeToConfirm(t.confirmWord)}
            </label>
            <input
              id="t082-confirm"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="mt-1 block w-40 rounded-xl border-2 border-danger/40 bg-background px-3 py-2 text-sm outline-none focus:border-danger"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <CozyButton
              variant="soft"
              className="text-danger"
              disabled={typed.trim() !== t.confirmWord}
              onClick={() => void run()}
            >
              {t.confirmDelete}
            </CozyButton>
            <CozyButton variant="ghost" onClick={() => setPhase("idle")}>
              {t.cancel}
            </CozyButton>
          </div>
        </div>
      )}

      {(phase === "deleting" || phase === "generating") && (
        <p className="text-sm text-ink-soft">
          {phase === "deleting" ? t.deleting : t.generating}
        </p>
      )}

      {phase === "done" && deleted && (
        <div className="rounded-xl border-2 border-indigo/40 bg-indigo-soft px-4 py-3">
          <div className="font-semibold">{t.doneTitle}</div>
          <p className="mt-1 text-sm text-ink-soft">{t.doneCounts(deleted)}</p>
          <div className="mt-3">
            <CozyButton
              variant="soft"
              onClick={() => {
                window.location.href = withBase("/map");
              }}
            >
              {t.goMap}
            </CozyButton>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
