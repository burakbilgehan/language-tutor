"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CozyButton } from "@/components/shared/CozyButton";
import { ChipGrid, ChoiceCard } from "@/components/shared/ProfileControls";
import { GeneratingScreen } from "./GeneratingScreen";
import { pick } from "@/lib/i18n";
import { profileData, createProfileApi, curriculumGenerate } from "@/lib/client-api";
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
  const router = useRouter();
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
      })
      .catch(() => {});
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
        // Statik mod: üretim inline tamamlandı — direkt haritaya.
        router.push("/map");
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

  if (jobId) {
    return (
      <GeneratingScreen
        jobId={jobId}
        uiLanguage={draft.uiLanguage}
        onDone={() => {
          localStorage.removeItem("curriculumJobId");
          router.push("/map");
        }}
        onRetry={() => {
          localStorage.removeItem("curriculumJobId");
          setJobId(null);
        }}
      />
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

      <div className="rounded-cozy bg-surface p-8 shadow-cozy">
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
