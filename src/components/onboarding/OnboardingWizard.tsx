"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CozyButton } from "@/components/shared/CozyButton";
import { GeneratingScreen } from "./GeneratingScreen";

type Level = "zero" | "beginner" | "elementary" | "intermediate";

interface Draft {
  targetLanguage: "ja" | "nl";
  displayName: string;
  goals: string[];
  selfLevel: Level;
  minutesPerWeek: number;
  interests: string[];
  motivation: string;
}

const GOAL_OPTIONS = [
  "Günlük konuşma",
  "Seyahat",
  "Anime / dizi / film anlamak",
  "Kitap ve manga okumak",
  "İş / kariyer",
  "Sınav (JLPT vb.)",
  "Kültürü tanımak",
];

const INTEREST_OPTIONS = [
  "Anime & Manga",
  "Yemek",
  "Teknoloji",
  "Müzik",
  "Oyunlar",
  "Tarih",
  "Seyahat",
  "Spor",
  "Sanat",
  "Doğa",
];

const LEVELS: { value: Level; label: string; desc: string }[] = [
  { value: "zero", label: "Sıfır", desc: "Hiç bilmiyorum, tamamen yeniyim" },
  { value: "beginner", label: "Çaylak", desc: "Birkaç kelime ve selamlaşma biliyorum" },
  { value: "elementary", label: "Temel", desc: "Basit cümleler kurabiliyorum" },
  { value: "intermediate", label: "Orta", desc: "Günlük konuşmaları takip edebiliyorum" },
];

const MINUTE_OPTIONS = [
  { value: 60, label: "Haftada ~1 saat", desc: "Sakin tempo" },
  { value: 150, label: "Haftada 2-3 saat", desc: "Dengeli tempo" },
  { value: 300, label: "Haftada 5+ saat", desc: "Kararlıyım!" },
];

const TOTAL_STEPS = 6;

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({
    targetLanguage: "ja",
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

  // Refresh-safety: resume polling an in-flight generation.
  useEffect(() => {
    const saved = localStorage.getItem("curriculumJobId");
    if (saved) setJobId(saved);
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
    try {
      const profileRes = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!profileRes.ok) throw new Error("Profil kaydedilemedi");
      const { profile } = await profileRes.json();

      const genRes = await fetch("/api/curriculum/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profile.id }),
      });
      if (!genRes.ok) throw new Error("Müfredat üretimi başlatılamadı");
      const { jobId } = await genRes.json();
      localStorage.setItem("curriculumJobId", jobId);
      setJobId(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bir şeyler ters gitti");
    } finally {
      setSubmitting(false);
    }
  }, [draft]);

  if (jobId) {
    return (
      <GeneratingScreen
        jobId={jobId}
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
    draft.displayName.trim().length > 0,
    draft.goals.length > 0,
    true, // level always has a value
    true, // minutes always has a value
    draft.interests.length > 0,
    true, // motivation optional
  ][step];

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
          <StepShell
            title="Merhaba! 🌸"
            subtitle="Ben Kumo. Sana özel bir dil yolculuğu hazırlayacağım. Önce tanışalım — adın ne, hangi dili öğreniyoruz?"
          >
            <input
              autoFocus
              value={draft.displayName}
              onChange={(e) =>
                setDraft((d) => ({ ...d, displayName: e.target.value }))
              }
              placeholder="Adın"
              className="w-full rounded-xl border-2 border-surface-2 bg-background px-4 py-3 outline-none focus:border-accent"
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(
                [
                  { code: "ja", flag: "🇯🇵", name: "Japonca" },
                  { code: "nl", flag: "🇳🇱", name: "Hollandaca" },
                ] as const
              ).map((l) => (
                <ChoiceCard
                  key={l.code}
                  selected={draft.targetLanguage === l.code}
                  onClick={() =>
                    setDraft((d) => ({ ...d, targetLanguage: l.code }))
                  }
                  title={`${l.flag} ${l.name}`}
                />
              ))}
            </div>
          </StepShell>
        )}

        {step === 1 && (
          <StepShell
            title="Hedefin ne?"
            subtitle="Birden fazla seçebilirsin — müfredatını buna göre şekillendireceğim."
          >
            <ChipGrid
              options={GOAL_OPTIONS}
              selected={draft.goals}
              onToggle={(v) => toggle("goals", v)}
            />
          </StepShell>
        )}

        {step === 2 && (
          <StepShell
            title="Şu an neredesin?"
            subtitle="Dürüst ol, buna göre başlangıç noktanı seçeceğim."
          >
            <div className="flex flex-col gap-3">
              {LEVELS.map((l) => (
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
          <StepShell
            title="Haftada ne kadar vakit ayırabilirsin?"
            subtitle="Gerçekçi bir tempo, sürdürülebilir bir yolculuk demek."
          >
            <div className="flex flex-col gap-3">
              {MINUTE_OPTIONS.map((m) => (
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
          <StepShell
            title="Nelerden hoşlanırsın?"
            subtitle="Ders örneklerini ilgi alanlarından seçeceğim — öğrenmek böyle daha tatlı."
          >
            <ChipGrid
              options={INTEREST_OPTIONS}
              selected={draft.interests}
              onToggle={(v) => toggle("interests", v)}
            />
          </StepShell>
        )}

        {step === 5 && (
          <StepShell
            title="Son soru: neden bu dil?"
            subtitle="Kendi cümlelerinle anlat — motivasyonunu bilmek yolculuğu kişiselleştirir. (İstersen boş bırak.)"
          >
            <textarea
              value={draft.motivation}
              onChange={(e) =>
                setDraft((d) => ({ ...d, motivation: e.target.value }))
              }
              rows={4}
              placeholder="Örn: Çocukluğumdan beri Japonya'ya taşınmayı hayal ediyorum..."
              className="w-full resize-none rounded-xl border-2 border-surface-2 bg-background px-4 py-3 outline-none focus:border-accent"
            />
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
            Geri
          </CozyButton>
          {step < TOTAL_STEPS - 1 ? (
            <CozyButton onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Devam
            </CozyButton>
          ) : (
            <CozyButton onClick={submit} disabled={submitting}>
              {submitting ? "Hazırlanıyor..." : "Yolculuğu Başlat ✨"}
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

function ChipGrid({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            onClick={() => onToggle(o)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95 cursor-pointer ${
              on
                ? "bg-accent text-surface shadow-cozy"
                : "bg-surface-2 text-ink hover:bg-accent-soft"
            }`}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function ChoiceCard({
  selected,
  onClick,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border-2 px-4 py-3 text-left transition-all active:scale-[0.98] cursor-pointer ${
        selected
          ? "border-accent bg-accent-soft/40"
          : "border-surface-2 bg-background hover:border-accent-soft"
      }`}
    >
      <div className="font-semibold">{title}</div>
      {desc && <div className="text-sm text-ink-soft">{desc}</div>}
    </button>
  );
}
