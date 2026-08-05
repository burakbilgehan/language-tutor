"use client";

import { useEffect, useState } from "react";
import { CozyButton } from "@/components/shared/CozyButton";
import { pick } from "@/lib/i18n";
import { localizeError } from "@/lib/i18n/errors";
import { resolveUiLang } from "@/lib/i18n/use-localize-error";
import {
  curriculumPedagogyPreview,
  curriculumPedagogySave,
} from "@/lib/client-api";
import type { PedagogyPreview } from "@/core/curriculum-gen";

// T-080. Curriculum generation used to be a black box: 2-5 minutes of waiting
// before the user could see whether the framing was any good. This panel shows
// the EXACT prompt that will be sent, split at its one editable seam:
//
//   before (locked)  +  pedagogy (textarea)  +  after (locked)
//
// The split comes from `chapterPromptParts`, the same function generation
// assembles its prompt from, so what is displayed cannot drift from what is
// sent. The locked halves carry the data contract (JSON shape, unit/node
// counts, xp ranges, output language): visible, so nothing is hidden, but not
// editable, because breaking them breaks parsing rather than the curriculum.
//
// Scope (explicit ruling): customization exists ONLY for curriculum
// generation. Lesson prompts stay fixed.

const S = {
  tr: {
    title: "Gönderilecek prompt",
    intro:
      "Aşağıdaki metin, müfredatını üretmek için yapay zekâya gönderilecek. Pedagoji bölümünü dilediğin gibi değiştirebilirsin; veri sözleşmesi bölümleri kilitli, çünkü onları bozmak üretimi tamamen bozar.",
    loading: "Sana özel prompt hazırlanıyor... Bu bir dakikayı bulabilir.",
    lockedBefore: "Kilitli: profil ve bağlam",
    lockedAfter: "Kilitli: veri sözleşmesi",
    systemLabel: "Kilitli: sistem talimatı",
    editable: "Pedagoji talimatı (düzenlenebilir)",
    editableHint:
      "Bu bölüm senin dil çiftin için yazıldı. Neyi erken öğretmek istediğini, nelerin atlanmasını istediğini buraya yaz.",
    charCount: (n: number) => `${n} karakter`,
    tooShort: "En az 400 karakter olmalı.",
    editedBadge: "Bu metni sen düzenledin",
    staleTitle: "Bu metin başka bir dil çifti için yazılmıştı",
    staleBody:
      "Ana dilini değiştirdiğin için bu pedagoji metni artık profilinle uyuşmuyor. Düzenlemen silinmedi; istersen olduğu gibi kullan, istersen yeni dil çiftin için baştan yazdır.",
    regenerate: "Yeniden yazdır",
    regenerating: "Yazdırılıyor...",
    regenerateConfirm:
      "Buradaki metnin yerine yenisi yazılacak. Kendi düzenlemen kaybolur. Emin misin?",
    save: "Kaydet ve üret",
    saving: "Kaydediliyor...",
    cancel: "Vazgeç",
    retry: "Tekrar dene",
    failed: "Prompt hazırlanamadı",
  },
  en: {
    title: "The prompt that will be sent",
    intro:
      "The text below is what gets sent to the AI to build your curriculum. You can change the pedagogy section however you like; the data-contract sections are locked, because breaking those breaks generation outright.",
    loading: "Preparing your prompt... This can take up to a minute.",
    lockedBefore: "Locked: profile and context",
    lockedAfter: "Locked: data contract",
    systemLabel: "Locked: system instruction",
    editable: "Pedagogy instruction (editable)",
    editableHint:
      "This section was written for your language pair. Say what you want taught early and what you want skipped.",
    charCount: (n: number) => `${n} characters`,
    tooShort: "It must be at least 400 characters.",
    editedBadge: "You edited this text",
    staleTitle: "This text was written for a different language pair",
    staleBody:
      "You changed your language, so this pedagogy text no longer matches your profile. Your edit was not deleted; use it as it is, or have it rewritten for your new language pair.",
    regenerate: "Rewrite it",
    regenerating: "Rewriting...",
    regenerateConfirm:
      "The text here will be replaced with a new one. Your own edit will be lost. Are you sure?",
    save: "Save and generate",
    saving: "Saving...",
    cancel: "Cancel",
    retry: "Try again",
    failed: "Could not prepare the prompt",
  },
};

/** Read-only slab of prompt text. Same monospace treatment as the textarea so
 * the locked and editable regions read as one continuous document. */
function LockedBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="mt-4">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-ink-soft">
        <span aria-hidden>🔒</span>
        {label}
      </div>
      <pre className="max-h-56 overflow-auto rounded-xl border-2 border-surface-2 bg-surface-2/40 px-4 py-3 text-xs whitespace-pre-wrap text-ink-soft">
        {text}
      </pre>
    </div>
  );
}

export interface PromptCustomizerProps {
  profileId: string;
  /** Loose on purpose: callers pass either an onboarding draft's typed code or
   * the profile meta's plain string. `pick`/`resolveUiLang` both narrow it. */
  uiLanguage: string | null | undefined;
  /** Called after the edited body is persisted; the caller starts generation. */
  onSaved: () => void;
  onCancel: () => void;
}

export function PromptCustomizer({
  profileId,
  uiLanguage,
  onSaved,
  onCancel,
}: PromptCustomizerProps) {
  const t = pick(S, uiLanguage);
  const lang = resolveUiLang(uiLanguage);
  const [preview, setPreview] = useState<PedagogyPreview | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "loading" | "saving" | "regen">(
    "loading"
  );
  const [attempt, setAttempt] = useState(0);

  // The preview call runs the stage-1 meta-call when the profile has no usable
  // body yet, so it is deliberately fired once per mount (plus explicit
  // retries), never on every keystroke.
  useEffect(() => {
    let alive = true;
    setBusy("loading");
    setError(null);
    curriculumPedagogyPreview(profileId)
      .then((p) => {
        if (!alive) return;
        setPreview(p);
        setBody(p.pedagogy);
        setBusy(null);
      })
      .catch((e) => {
        if (!alive) return;
        setError(localizeError(e, lang));
        setBusy(null);
      });
    return () => {
      alive = false;
    };
  }, [profileId, lang, attempt]);

  const regenerate = async () => {
    if (!window.confirm(t.regenerateConfirm)) return;
    setBusy("regen");
    setError(null);
    try {
      const p = await curriculumPedagogyPreview(profileId, true);
      setPreview(p);
      setBody(p.pedagogy);
    } catch (e) {
      setError(localizeError(e, lang));
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    setBusy("saving");
    setError(null);
    try {
      await curriculumPedagogySave(profileId, body);
      onSaved();
    } catch (e) {
      setError(localizeError(e, lang));
      setBusy(null);
    }
  };

  if (busy === "loading") {
    return (
      <div className="rounded-cozy border-2 border-surface-2 bg-surface p-5">
        <p className="text-sm text-ink-soft">{t.loading}</p>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="rounded-cozy border-2 border-surface-2 bg-surface p-5">
        <p className="text-sm text-danger">{error ?? t.failed}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <CozyButton variant="soft" onClick={() => setAttempt((n) => n + 1)}>
            {t.retry}
          </CozyButton>
          <CozyButton variant="ghost" onClick={onCancel}>
            {t.cancel}
          </CozyButton>
        </div>
      </div>
    );
  }

  const tooShort = body.trim().length < 400;

  return (
    <div className="rounded-cozy border-2 border-surface-2 bg-surface p-5 text-left">
      <h3 className="text-lg font-semibold">{t.title}</h3>
      <p className="mt-1 text-sm text-ink-soft">{t.intro}</p>

      {/* A stale stamp on an EDITED body never deletes the edit (T-080); it
          surfaces here and regeneration becomes the user's explicit call. */}
      {preview.stale && (
        <div className="mt-4 rounded-xl border-2 border-indigo/40 bg-indigo-soft px-4 py-3">
          <div className="text-sm font-semibold">{t.staleTitle}</div>
          <p className="mt-1 text-sm text-ink-soft">{t.staleBody}</p>
        </div>
      )}

      <LockedBlock label={t.systemLabel} text={preview.system} />
      <LockedBlock label={t.lockedBefore} text={preview.before} />

      <div className="mt-4">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-indigo">
            ✏️ {t.editable}
          </span>
          {preview.edited && (
            <span className="rounded-full bg-indigo-soft px-2 py-0.5 text-xs text-ink-soft">
              {t.editedBadge}
            </span>
          )}
        </div>
        <p className="mb-2 text-xs text-ink-soft">{t.editableHint}</p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={16}
          spellCheck={false}
          className="w-full rounded-xl border-2 border-indigo/40 bg-background px-4 py-3 font-mono text-xs outline-none focus:border-indigo focus:ring-4 focus:ring-indigo/15"
        />
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-soft">
          <span>{t.charCount(body.trim().length)}</span>
          {tooShort && <span className="text-danger">{t.tooShort}</span>}
        </div>
      </div>

      <LockedBlock label={t.lockedAfter} text={preview.after} />

      {error && (
        <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <CozyButton onClick={() => void save()} disabled={busy !== null || tooShort}>
          {busy === "saving" ? t.saving : t.save}
        </CozyButton>
        <CozyButton
          variant="soft"
          onClick={() => void regenerate()}
          disabled={busy !== null}
        >
          {busy === "regen" ? t.regenerating : t.regenerate}
        </CozyButton>
        <CozyButton variant="ghost" onClick={onCancel} disabled={busy !== null}>
          {t.cancel}
        </CozyButton>
      </div>
    </div>
  );
}
