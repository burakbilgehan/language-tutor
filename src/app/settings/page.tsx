"use client";

import { useEffect, useState } from "react";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { CozyButton } from "@/components/shared/CozyButton";

interface ProfileDto {
  displayName: string;
  targetLanguage: string;
  selfLevel: string;
  minutesPerWeek: number;
  goals: string[];
  interests: string[];
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileDto | null>(null);
  const [health, setHealth] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [dark, setDark] = useState(false);
  const [llm, setLlm] = useState<{
    todayUsd: number;
    todayCalls: number;
    totalUsd: number;
    totalCalls: number;
  } | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setProfile(d.profile));
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => setLlm(d.llm))
      .catch(() => {});
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.classList.toggle("light", !next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const checkLlm = async () => {
    setChecking(true);
    setHealth(null);
    try {
      const res = await fetch("/api/health/llm", { method: "POST" });
      const body = await res.json();
      setHealth(
        body.ok
          ? `✅ Bağlantı sağlıklı (${(body.ms / 1000).toFixed(1)}s)`
          : `❌ ${body.error ?? "Bağlantı sorunu"}`
      );
    } catch {
      setHealth("❌ Sunucuya ulaşılamadı");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-dvh pb-16">
      <StatsHeader title="Ayarlar" backHref="/map" />
      <main className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-8">
        {profile && (
          <section className="rounded-cozy bg-surface p-6 shadow-cozy">
            <h2 className="mb-3 font-semibold">Profil</h2>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-ink-soft">İsim</dt>
              <dd>{profile.displayName}</dd>
              <dt className="text-ink-soft">Hedef dil</dt>
              <dd>{profile.targetLanguage === "ja" ? "🇯🇵 Japonca" : "🇳🇱 Hollandaca"}</dd>
              <dt className="text-ink-soft">Seviye</dt>
              <dd>{profile.selfLevel}</dd>
              <dt className="text-ink-soft">Haftalık süre</dt>
              <dd>{profile.minutesPerWeek} dk</dd>
              <dt className="text-ink-soft">Hedefler</dt>
              <dd>{profile.goals.join(", ")}</dd>
              <dt className="text-ink-soft">İlgi alanları</dt>
              <dd>{profile.interests.join(", ")}</dd>
            </dl>
          </section>
        )}

        <section className="rounded-cozy bg-surface p-6 shadow-cozy">
          <h2 className="mb-3 font-semibold">Görünüm</h2>
          <CozyButton variant="soft" onClick={toggleDark}>
            {dark ? "☀️ Açık tema" : "🌙 Koyu tema"}
          </CozyButton>
        </section>

        <section className="rounded-cozy bg-surface p-6 shadow-cozy">
          <h2 className="mb-3 font-semibold">LLM Harcaması</h2>
          {llm ? (
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-ink-soft">Bugün</dt>
              <dd>
                ${llm.todayUsd.toFixed(2)}{" "}
                <span className="text-ink-soft">({llm.todayCalls} çağrı)</span>
              </dd>
              <dt className="text-ink-soft">Toplam</dt>
              <dd>
                ${llm.totalUsd.toFixed(2)}{" "}
                <span className="text-ink-soft">({llm.totalCalls} çağrı)</span>
              </dd>
            </dl>
          ) : (
            <p className="text-sm text-ink-soft">Henüz kayıtlı çağrı yok.</p>
          )}
          <p className="mt-3 text-xs text-ink-soft">
            Max aboneliği kullanıldığı için bu tutar faturalandırılmaz — API ile
            yapılsaydı ne tutacağını gösterir (CLI&apos;ın raporladığı değer).
          </p>
        </section>

        <section className="rounded-cozy bg-surface p-6 shadow-cozy">
          <h2 className="mb-1 font-semibold">LLM Bağlantısı</h2>
          <p className="mb-3 text-sm text-ink-soft">
            Claude CLI üzerinden Max aboneliğinle çalışır. Sorun yaşarsan
            terminalde <code className="rounded bg-surface-2 px-1.5">claude</code>{" "}
            çalıştırıp giriş yaptığından emin ol.
          </p>
          <CozyButton variant="soft" onClick={checkLlm} disabled={checking}>
            {checking ? "Kontrol ediliyor..." : "Bağlantıyı test et"}
          </CozyButton>
          {health && <p className="mt-3 text-sm">{health}</p>}
        </section>
      </main>
    </div>
  );
}
