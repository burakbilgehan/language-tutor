"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { withBase } from "@/lib/base-path";
import { CozyButton } from "@/components/shared/CozyButton";
import { ChipGrid, ChoiceCard } from "@/components/shared/ProfileControls";
import { GeneratingScreen } from "./GeneratingScreen";
import { pick } from "@/lib/i18n";
import {
  profileData,
  createProfileApi,
  curriculumGenerate,
  saveImportApi,
} from "@/lib/client-api";
import { useLlmStatus } from "@/lib/llm-status";
import { LlmSetupWizard } from "@/components/settings/LlmSetupWizard";
import {
  GOAL_OPTIONS,
  INTEREST_OPTIONS,
  LANGUAGES,
  languageLabel,
  levelsFor,
  minuteOptionsFor,
  NATIVE_LANGUAGES,
  optionLabel,
  type LanguageCode,
  type NativeLanguageCode,
  type SelfLevel,
} from "@/lib/profile-options";

interface Draft {
  targetLanguage: LanguageCode;
  nativeLanguage: NativeLanguageCode;
  uiLanguage: NativeLanguageCode;
  displayName: string;
  goals: string[];
  selfLevel: SelfLevel;
  minutesPerWeek: number;
  interests: string[];
  motivation: string;
}

const TOTAL_STEPS = 6;

// No profile exists yet during onboarding, so the copy follows the native
// language the user picks in step 0 (draft.uiLanguage) live, via pick().
const S = {
  tr: {
    introTitle: "Merhaba! 🌸",
    introSubtitle: "Önce bir kayıt var mı diye soralım.",
    loadTitle: "Kayıt yükle",
    loadDesc: "Daha önce indirdiğin bir kayıt dosyan varsa yükle, kaldığın yerden devam et.",
    loadButton: "📂 Dosya seç",
    loadingLabel: "Yükleniyor...",
    newTitle: "Yeni başla",
    newDesc: "Sıfırdan bir dil yolculuğuna başla — birkaç soruyla seni tanıyalım.",
    newButton: "✨ Yeni başla",
    importFailed: "Kayıt yüklenemedi",
    profileSaveFailed: "Profil kaydedilemedi",
    curriculumStartFailed: "Müfredat üretimi başlatılamadı",
    genericError: "Bir şeyler ters gitti",
    llmNeeded:
      "Müfredatını üretmek için bir yapay zekâ bağlantısı gerekiyor — yolculuğa başlamadan önce bağlayalım:",
    step0Title: "Merhaba! 🌸",
    step0Subtitle:
      "Ben Kumo. Sana özel bir dil yolculuğu hazırlayacağım. Önce tanışalım — adın ne, hangi dili öğreniyoruz?",
    namePlaceholder: "Adın",
    alreadyUsedDesc: "Zaten mevcut — ayarlardan geç",
    spokenLanguageLabel: "Konuştuğun dil (dersler ve arayüz bu dilde olur):",
    step1Title: "Hedefin ne?",
    step1Subtitle:
      "Birden fazla seçebilirsin — müfredatını buna göre şekillendireceğim.",
    step2Title: "Şu an neredesin?",
    step2Subtitle: "Dürüst ol, buna göre başlangıç noktanı seçeceğim.",
    step3Title: "Haftada ne kadar vakit ayırabilirsin?",
    step3Subtitle: "Gerçekçi bir tempo, sürdürülebilir bir yolculuk demek.",
    step4Title: "Nelerden hoşlanırsın?",
    step4Subtitle:
      "Ders örneklerini ilgi alanlarından seçeceğim — öğrenmek böyle daha tatlı.",
    step5Title: "Son soru: neden bu dil?",
    step5Subtitle:
      "Kendi cümlelerinle anlat — motivasyonunu bilmek yolculuğu kişiselleştirir. (İstersen boş bırak.)",
    motivationPlaceholder:
      "Örn: Çocukluğumdan beri Japonya'ya taşınmayı hayal ediyorum...",
    back: "Geri",
    next: "Devam",
    preparing: "Hazırlanıyor...",
    start: "Yolculuğu Başlat ✨",
  },
  en: {
    introTitle: "Hello! 🌸",
    introSubtitle: "First, let's check if you already have a save.",
    loadTitle: "Load save",
    loadDesc: "If you have a save file from before, load it and pick up where you left off.",
    loadButton: "📂 Choose file",
    loadingLabel: "Loading...",
    newTitle: "New game",
    newDesc: "Start a fresh language journey — a few questions and we'll get to know you.",
    newButton: "✨ Start new",
    importFailed: "Could not load the save",
    profileSaveFailed: "Could not save the profile",
    curriculumStartFailed: "Could not start curriculum generation",
    genericError: "Something went wrong",
    llmNeeded:
      "Generating your curriculum needs an AI connection — let's set it up before starting the journey:",
    step0Title: "Hello! 🌸",
    step0Subtitle:
      "I'm Kumo. I'll craft a language journey just for you. First, let's meet — what's your name, and which language are we learning?",
    namePlaceholder: "Your name",
    alreadyUsedDesc: "Already exists — switch from settings",
    spokenLanguageLabel:
      "Your language (lessons and the interface will use it):",
    step1Title: "What's your goal?",
    step1Subtitle:
      "You can pick more than one — I'll shape your curriculum around it.",
    step2Title: "Where are you right now?",
    step2Subtitle: "Be honest — I'll pick your starting point based on this.",
    step3Title: "How much time can you spare each week?",
    step3Subtitle: "A realistic pace means a sustainable journey.",
    step4Title: "What do you enjoy?",
    step4Subtitle:
      "I'll pick lesson examples from your interests — learning is sweeter that way.",
    step5Title: "Last question: why this language?",
    step5Subtitle:
      "Tell me in your own words — knowing your motivation personalizes the journey. (Feel free to leave it blank.)",
    motivationPlaceholder:
      "E.g. I've dreamed of moving to Japan since childhood...",
    back: "Back",
    next: "Continue",
    preparing: "Preparing...",
    start: "Start the Journey ✨",
  },
};

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    targetLanguage: "ja",
    nativeLanguage: "tr",
    uiLanguage: "tr",
    displayName: "",
    goals: [],
    selfLevel: "zero",
    minutesPerWeek: 150,
    interests: [],
    motivation: "",
  });
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Statikte ilk açılışta LLM bağlı değildir; son adımda sihirbazı gömerek
  // submit'ten önce bağlanma şansı ver (atlanabilir — hata mesajı yol gösterir).
  const llm = useLlmStatus();
  const [llmDone, setLlmDone] = useState(false);

  const t = pick(S, draft.uiLanguage);

  // Languages that already have a profile — "adding a language" mode: those
  // are switched from settings, not re-onboarded.
  const [usedLanguages, setUsedLanguages] = useState<string[]>([]);

  // T-025: on a truly empty session (no profile at all — not "adding a
  // language", which lands here with profiles.length > 0), the very first
  // screen offers Load save / New game instead of jumping straight into the
  // wizard. "checking" avoids flashing the wrong screen while profileData()
  // is in flight; showIntro flips to false forever once left (New game or a
  // successful Load, which navigates away anyway).
  const [checkingProfiles, setCheckingProfiles] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    // No confirm() here unlike Settings: an empty session has nothing to
    // erase, so the "this replaces your progress" warning doesn't apply.
    setImporting(true);
    setImportError(null);
    try {
      await saveImportApi(file);
      window.location.href = withBase("/map"); // full reload → fresh reads, skip wizard entirely
    } catch (err) {
      setImportError(err instanceof Error ? err.message : t.importFailed);
      setImporting(false);
    }
  };

  // Detect the visitor's spoken language from the browser locale and
  // preselect it — they can still override in step 0.
  useEffect(() => {
    const browser = (navigator.language || "").toLowerCase();
    const detected = NATIVE_LANGUAGES.find((l) =>
      browser.startsWith(l.code)
    )?.code;
    if (detected) {
      setDraft((d) => ({ ...d, nativeLanguage: detected, uiLanguage: detected }));
    }
  }, []);

  // Refresh-safety: resume polling an in-flight generation.
  useEffect(() => {
    const saved = localStorage.getItem("curriculumJobId");
    if (saved) setJobId(saved);
    profileData()
      .then((d) => {
        // Müfredatı olan diller kilitlenir; yarım kalmış (müfredatsız) profil
        // dili yeniden onboard edilebilir. Eski sunucu DTO'suna fallback.
        const used =
          d.usedLanguages ?? (d.profiles ?? []).map((p) => p.targetLanguage);
        setUsedLanguages(used);
        const free = LANGUAGES.find((l) => !used.includes(l.code));
        setDraft((prev) => ({
          ...prev,
          targetLanguage: free?.code ?? prev.targetLanguage,
          displayName: prev.displayName || (d.profile?.displayName ?? ""),
        }));
        // Truly empty session (no profile whatsoever) → offer Load/New.
        // Adding a 2nd+ language already has profiles, so it skips straight
        // to the wizard as before.
        setShowIntro((d.profiles ?? []).length === 0);
      })
      .catch(() => {
        // profileData() failing (e.g. fresh static DB before first read)
        // reads the same as "no profile" — still offer Load/New.
        setShowIntro(true);
      })
      .finally(() => setCheckingProfiles(false));
  }, []);

  const toggle = (key: "goals" | "interests", value: string) =>
    setDraft((d) => ({
      ...d,
      [key]: d[key].includes(value)
        ? d[key].filter((v) => v !== value)
        : [...d[key], value],
    }));

  const submit = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    const t = pick(S, draft.uiLanguage);
    try {
      const { profile } = await createProfileApi(
        draft as unknown as Record<string, unknown>
      );
      if (!profile) throw new Error(t.profileSaveFailed);

      const gen = await curriculumGenerate(profile.id);
      if (!gen.jobId) {
        // Statik mod: üretim inline tamamlandı — full reload, profil meta cache tazelensin (T-013).
        window.location.href = withBase("/map");
        return;
      }
      localStorage.setItem("curriculumJobId", gen.jobId);
      setJobId(gen.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
    } finally {
      setSubmitting(false);
    }
  }, [draft]);

  // An in-flight generation job implies a profile already exists, so this
  // takes priority over the intro/loading checks below.
  if (jobId) {
    return (
      <GeneratingScreen
        jobId={jobId}
        uiLanguage={draft.uiLanguage}
        onDone={() => {
          localStorage.removeItem("curriculumJobId");
          window.location.href = withBase("/map");
        }}
        onRetry={() => {
          localStorage.removeItem("curriculumJobId");
          setJobId(null);
        }}
      />
    );
  }

  if (checkingProfiles) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-ink-soft">
        <div className="animate-float-slow text-5xl">🌸</div>
      </div>
    );
  }

  if (showIntro) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-12">
        <div className="rounded-cozy bg-surface p-5 shadow-cozy sm:p-8">
          <h1 className="text-2xl font-semibold">{t.introTitle}</h1>
          <p className="mt-2 mb-6 text-ink-soft">{t.introSubtitle}</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border-2 border-surface-2 bg-background p-5">
              <div className="font-semibold">{t.loadTitle}</div>
              <p className="mt-1 mb-4 text-sm text-ink-soft">{t.loadDesc}</p>
              <CozyButton
                variant="soft"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? t.loadingLabel : t.loadButton}
              </CozyButton>
              <input
                ref={fileInputRef}
                type="file"
                accept=".db"
                className="hidden"
                onChange={onImportFile}
              />
            </div>

            <div className="rounded-xl border-2 border-surface-2 bg-background p-5">
              <div className="font-semibold">{t.newTitle}</div>
              <p className="mt-1 mb-4 text-sm text-ink-soft">{t.newDesc}</p>
              <CozyButton onClick={() => setShowIntro(false)}>
                {t.newButton}
              </CozyButton>
            </div>
          </div>

          {importError && (
            <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
              {importError}
            </p>
          )}
        </div>
      </div>
    );
  }

  const canNext = [
    draft.displayName.trim().length > 0 &&
      !usedLanguages.includes(draft.targetLanguage),
    draft.goals.length > 0,
    true, // level always has a value
    true, // minutes always has a value
    draft.interests.length > 0,
    true, // motivation optional
  ][step];

  // ChipGrid works on plain strings, so translated labels are shown while the
  // stored VALUES stay the canonical Turkish strings (DB/prompt contract).
  const chipProps = (key: "goals" | "interests", options: string[]) => ({
    options: options.map((v) => optionLabel(v, draft.uiLanguage)),
    selected: draft[key].map((v) => optionLabel(v, draft.uiLanguage)),
    onToggle: (label: string) =>
      toggle(
        key,
        options.find((v) => optionLabel(v, draft.uiLanguage) === label) ?? label
      ),
  });

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-6 py-12">
      <div className="mb-8 flex gap-2">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-accent" : "bg-surface-2"
            }`}
          />
        ))}
      </div>

      <div className="rounded-cozy bg-surface p-5 shadow-cozy sm:p-8">
        {step === 0 && (
          <StepShell title={t.step0Title} subtitle={t.step0Subtitle}>
            <input
              autoFocus
              value={draft.displayName}
              onChange={(e) =>
                setDraft((d) => ({ ...d, displayName: e.target.value }))
              }
              placeholder={t.namePlaceholder}
              className="w-full rounded-xl border-2 border-surface-2 bg-background px-4 py-3 outline-none focus:border-accent"
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {LANGUAGES.map((l) => {
                const used = usedLanguages.includes(l.code);
                return (
                  <ChoiceCard
                    key={l.code}
                    selected={draft.targetLanguage === l.code}
                    disabled={used}
                    onClick={() =>
                      setDraft((d) => ({ ...d, targetLanguage: l.code }))
                    }
                    title={languageLabel(l.code, draft.uiLanguage)}
                    desc={used ? t.alreadyUsedDesc : undefined}
                  />
                );
              })}
            </div>
            <p className="mt-6 mb-2 text-sm font-semibold text-ink-soft">
              {t.spokenLanguageLabel}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {NATIVE_LANGUAGES.map((l) => (
                <ChoiceCard
                  key={l.code}
                  selected={draft.nativeLanguage === l.code}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      nativeLanguage: l.code,
                      uiLanguage: l.code,
                    }))
                  }
                  title={`${l.flag} ${l.name}`}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === 1 && (
          <StepShell title={t.step1Title} subtitle={t.step1Subtitle}>
            <ChipGrid {...chipProps("goals", GOAL_OPTIONS)} />
          </StepShell>
        )}

        {step === 2 && (
          <StepShell title={t.step2Title} subtitle={t.step2Subtitle}>
            <div className="flex flex-col gap-3">
              {levelsFor(draft.uiLanguage).map((l) => (
                <ChoiceCard
                  key={l.value}
                  selected={draft.selfLevel === l.value}
                  onClick={() => setDraft((d) => ({ ...d, selfLevel: l.value }))}
                  title={l.label}
                  desc={l.desc}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === 3 && (
          <StepShell title={t.step3Title} subtitle={t.step3Subtitle}>
            <div className="flex flex-col gap-3">
              {minuteOptionsFor(draft.uiLanguage).map((m) => (
                <ChoiceCard
                  key={m.value}
                  selected={draft.minutesPerWeek === m.value}
                  onClick={() =>
                    setDraft((d) => ({ ...d, minutesPerWeek: m.value }))
                  }
                  title={m.label}
                  desc={m.desc}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === 4 && (
          <StepShell title={t.step4Title} subtitle={t.step4Subtitle}>
            <ChipGrid {...chipProps("interests", INTEREST_OPTIONS)} />
          </StepShell>
        )}

        {step === 5 && (
          <StepShell title={t.step5Title} subtitle={t.step5Subtitle}>
            <textarea
              value={draft.motivation}
              onChange={(e) =>
                setDraft((d) => ({ ...d, motivation: e.target.value }))
              }
              rows={4}
              placeholder={t.motivationPlaceholder}
              className="w-full resize-none rounded-xl border-2 border-surface-2 bg-background px-4 py-3 outline-none focus:border-accent"
            />
            {!llm.configured && !llmDone && (
              <div className="mt-6">
                <p className="mb-3 rounded-xl bg-accent-soft/40 px-4 py-3 text-sm">
                  {t.llmNeeded}
                </p>
                <LlmSetupWizard onDone={() => setLlmDone(true)} />
              </div>
            )}
          </StepShell>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between">
          <CozyButton
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || submitting}
          >
            {t.back}
          </CozyButton>
          {step < TOTAL_STEPS - 1 ? (
            <CozyButton onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              {t.next}
            </CozyButton>
          ) : (
            <CozyButton onClick={submit} disabled={submitting}>
              {submitting ? t.preparing : t.start}
            </CozyButton>
          )}
        </div>
      </div>
    </div>
  );
}

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 mb-6 text-ink-soft">{subtitle}</p>
      {children}
    </div>
  );
}
