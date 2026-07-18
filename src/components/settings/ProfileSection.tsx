"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { withBase } from "@/lib/base-path";
import { CozyButton } from "@/components/shared/CozyButton";
import { ChipGrid, ChoiceCard } from "@/components/shared/ProfileControls";
import {
  GOAL_OPTIONS,
  INTEREST_OPTIONS,
  LANGUAGES,
  NATIVE_LANGUAGES,
  languageLabel,
  levelLabel,
  levelsFor,
  minuteOptionsFor,
  nativeLanguageName,
  optionLabel,
  type SelfLevel,
} from "@/lib/profile-options";
import { useStrings } from "@/lib/i18n/use-strings";
import { useProfileMeta } from "@/lib/use-profile-meta";
import {
  profileData,
  patchProfile,
  switchProfile as switchProfile$,
} from "@/lib/client-api";

const S = {
  tr: {
    profileTitle: "Profil",
    edit: "✏️ Düzenle",
    name: "İsim",
    targetLanguage: "Hedef dil",
    nativeLanguage: "Konuştuğun dil",
    level: "Seviye",
    weeklyTime: "Haftalık süre",
    minutes: (n: number) => `${n} dk`,
    goals: "Hedefler",
    interests: "İlgi alanları",
    nativeLanguageField: "Konuştuğun dil (dersler ve arayüz bu dilde)",
    motivation: "Motivasyon",
    save: "Kaydet",
    saving: "Kaydediliyor...",
    cancel: "Vazgeç",
    saved: "✅ Kaydedildi. Yeni dersler bu tercihlerle üretilecek.",
    saveFailed: "Kaydedilemedi",
    switchFailed: "Geçiş yapılamadı",
    languageTitle: "Dil",
    languageDesc:
      "Her dilin kendi profili, haritası ve ilerlemesi var. Geçiş yapmak hiçbir şeyi silmez.",
    active: "Aktif",
    switchTo: (level: string) => `${level} · geçiş yap`,
    addLanguage: "➕ Yeni dil ekle",
  },
  en: {
    profileTitle: "Profile",
    edit: "✏️ Edit",
    name: "Name",
    targetLanguage: "Target language",
    nativeLanguage: "Your language",
    level: "Level",
    weeklyTime: "Weekly time",
    minutes: (n: number) => `${n} min`,
    goals: "Goals",
    interests: "Interests",
    nativeLanguageField: "Your language (lessons and the UI use this language)",
    motivation: "Motivation",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    saved: "✅ Saved. New lessons will be generated with these preferences.",
    saveFailed: "Could not save",
    switchFailed: "Could not switch",
    languageTitle: "Language",
    languageDesc:
      "Each language has its own profile, map, and progress. Switching never deletes anything.",
    active: "Active",
    switchTo: (level: string) => `${level} · switch`,
    addLanguage: "➕ Add a new language",
  },
};

interface ProfileDto {
  id: string;
  displayName: string;
  targetLanguage: string;
  nativeLanguage: string;
  uiLanguage: string;
  selfLevel: SelfLevel;
  minutesPerWeek: number;
  goals: string[];
  interests: string[];
  motivation: string;
}

interface ProfileSummary {
  id: string;
  displayName: string;
  targetLanguage: string;
  selfLevel: string;
  isActive: boolean;
}

export function ProfileSection() {
  const router = useRouter();
  const t = useStrings(S);
  const uiLanguage = useProfileMeta()?.uiLanguage;
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ProfileDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    profileData()
      .then((d) => {
        setProfile(d.profile as unknown as ProfileDto);
        setProfiles((d.profiles ?? []) as ProfileSummary[]);
      })
      .catch(() => {});
  }, []);

  const toggle = (key: "goals" | "interests", value: string) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            [key]: d[key].includes(value)
              ? d[key].filter((v) => v !== value)
              : [...d[key], value],
          }
        : d
    );

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setMsg(null);
    try {
      const body = await patchProfile({
        displayName: draft.displayName,
        nativeLanguage: draft.nativeLanguage,
        uiLanguage: draft.uiLanguage,
        goals: draft.goals,
        selfLevel: draft.selfLevel,
        minutesPerWeek: draft.minutesPerWeek,
        interests: draft.interests,
        motivation: draft.motivation,
      });
      setProfile(body.profile as unknown as ProfileDto);
      setProfiles((ps) =>
        ps.map((p) =>
          p.id === body.profile.id
            ? {
                ...p,
                displayName: body.profile.displayName,
                selfLevel: body.profile.selfLevel,
              }
            : p
        )
      );
      setEditing(false);
      setMsg(t.saved);
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : t.saveFailed}`);
    } finally {
      setSaving(false);
    }
  };

  const switchProfile = async (profileId: string) => {
    setSwitching(true);
    try {
      await switchProfile$(profileId);
      window.location.href = withBase("/map"); // full reload → fresh server reads
    } catch (err) {
      setMsg(`❌ ${err instanceof Error ? err.message : t.switchFailed}`);
      setSwitching(false);
    }
  };

  const freeLanguages = LANGUAGES.filter(
    (l) => !profiles.some((p) => p.targetLanguage === l.code)
  );

  // ChipGrid renders/toggles plain strings; map translated labels back to the
  // canonical Turkish option VALUES that are stored in the DB.
  const valueForLabel = (options: string[], label: string) =>
    options.find((o) => optionLabel(o, uiLanguage) === label) ?? label;

  const canSave =
    !!draft &&
    draft.displayName.trim().length > 0 &&
    draft.goals.length > 0 &&
    draft.interests.length > 0;

  if (!profile) return null;

  return (
    <>
      <section className="rounded-cozy bg-surface p-6 shadow-cozy">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{t.profileTitle}</h2>
          {!editing && (
            <CozyButton
              variant="ghost"
              onClick={() => {
                setDraft(profile);
                setMsg(null);
                setEditing(true);
              }}
            >
              {t.edit}
            </CozyButton>
          )}
        </div>

        {!editing ? (
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-ink-soft">{t.name}</dt>
            <dd>{profile.displayName}</dd>
            <dt className="text-ink-soft">{t.targetLanguage}</dt>
            <dd>{languageLabel(profile.targetLanguage, uiLanguage)}</dd>
            <dt className="text-ink-soft">{t.nativeLanguage}</dt>
            <dd>{nativeLanguageName(profile.nativeLanguage ?? "tr")}</dd>
            <dt className="text-ink-soft">{t.level}</dt>
            <dd>{levelLabel(profile.selfLevel, uiLanguage)}</dd>
            <dt className="text-ink-soft">{t.weeklyTime}</dt>
            <dd>{t.minutes(profile.minutesPerWeek)}</dd>
            <dt className="text-ink-soft">{t.goals}</dt>
            <dd>
              {profile.goals.map((g) => optionLabel(g, uiLanguage)).join(", ")}
            </dd>
            <dt className="text-ink-soft">{t.interests}</dt>
            <dd>
              {profile.interests
                .map((i) => optionLabel(i, uiLanguage))
                .join(", ")}
            </dd>
          </dl>
        ) : (
          draft && (
            <div className="flex flex-col gap-5">
              <Field label={t.name}>
                <input
                  value={draft.displayName}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, displayName: e.target.value } : d
                    )
                  }
                  className="w-full rounded-xl border-2 border-surface-2 bg-background px-4 py-3 outline-none focus:border-accent"
                />
              </Field>

              <Field label={t.nativeLanguageField}>
                <div className="grid grid-cols-2 gap-2">
                  {NATIVE_LANGUAGES.map((l) => (
                    <ChoiceCard
                      key={l.code}
                      selected={(draft.nativeLanguage ?? "tr") === l.code}
                      onClick={() =>
                        setDraft((d) =>
                          d
                            ? { ...d, nativeLanguage: l.code, uiLanguage: l.code }
                            : d
                        )
                      }
                      title={`${l.flag} ${l.name}`}
                    />
                  ))}
                </div>
              </Field>

              <Field label={t.level}>
                <div className="flex flex-col gap-2">
                  {levelsFor(uiLanguage).map((l) => (
                    <ChoiceCard
                      key={l.value}
                      selected={draft.selfLevel === l.value}
                      onClick={() =>
                        setDraft((d) =>
                          d ? { ...d, selfLevel: l.value } : d
                        )
                      }
                      title={l.label}
                      desc={l.desc}
                    />
                  ))}
                </div>
              </Field>

              <Field label={t.weeklyTime}>
                <div className="flex flex-col gap-2">
                  {minuteOptionsFor(uiLanguage).map((m) => (
                    <ChoiceCard
                      key={m.value}
                      selected={draft.minutesPerWeek === m.value}
                      onClick={() =>
                        setDraft((d) =>
                          d ? { ...d, minutesPerWeek: m.value } : d
                        )
                      }
                      title={m.label}
                      desc={m.desc}
                    />
                  ))}
                </div>
              </Field>

              <Field label={t.goals}>
                <ChipGrid
                  options={GOAL_OPTIONS.map((v) => optionLabel(v, uiLanguage))}
                  selected={draft.goals.map((v) => optionLabel(v, uiLanguage))}
                  onToggle={(label) =>
                    toggle("goals", valueForLabel(GOAL_OPTIONS, label))
                  }
                />
              </Field>

              <Field label={t.interests}>
                <ChipGrid
                  options={INTEREST_OPTIONS.map((v) =>
                    optionLabel(v, uiLanguage)
                  )}
                  selected={draft.interests.map((v) =>
                    optionLabel(v, uiLanguage)
                  )}
                  onToggle={(label) =>
                    toggle("interests", valueForLabel(INTEREST_OPTIONS, label))
                  }
                />
              </Field>

              <Field label={t.motivation}>
                <textarea
                  value={draft.motivation}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, motivation: e.target.value } : d
                    )
                  }
                  rows={3}
                  className="w-full resize-none rounded-xl border-2 border-surface-2 bg-background px-4 py-3 outline-none focus:border-accent"
                />
              </Field>

              <div className="flex gap-3">
                <CozyButton onClick={save} disabled={!canSave || saving}>
                  {saving ? t.saving : t.save}
                </CozyButton>
                <CozyButton
                  variant="ghost"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                >
                  {t.cancel}
                </CozyButton>
              </div>
            </div>
          )
        )}
        {msg && <p className="mt-3 text-sm">{msg}</p>}
      </section>

      <section className="rounded-cozy bg-surface p-6 shadow-cozy">
        <h2 className="mb-1 font-semibold">{t.languageTitle}</h2>
        <p className="mb-3 text-sm text-ink-soft">{t.languageDesc}</p>
        <div className="flex flex-col gap-2">
          {profiles.map((p) => (
            <ChoiceCard
              key={p.id}
              selected={p.isActive}
              disabled={switching}
              onClick={() => {
                if (!p.isActive) switchProfile(p.id);
              }}
              title={languageLabel(p.targetLanguage, uiLanguage)}
              desc={
                p.isActive
                  ? t.active
                  : t.switchTo(levelLabel(p.selfLevel, uiLanguage))
              }
            />
          ))}
        </div>
        {freeLanguages.length > 0 && (
          <div className="mt-3">
            <CozyButton
              variant="soft"
              onClick={() => router.push("/onboarding")}
            >
              {t.addLanguage}
            </CozyButton>
          </div>
        )}
      </section>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
        {label}
      </h3>
      {children}
    </div>
  );
}
