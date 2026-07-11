"use client";

import { useEffect, useRef, useState } from "react";
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
    byPurpose?: { purpose: string; calls: number; usd: number }[];
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    const ok = window.confirm(
      "Bu, bu makinedeki tüm ilerlemeyi silip yüklenen kayıtla değiştirir. Emin misin?"
    );
    if (!ok) return;

    setImporting(true);
    setSaveMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/save/import", { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Yüklenemedi");
      window.location.href = "/map"; // full reload → fresh server reads
    } catch (err) {
      setSaveMsg(
        `❌ ${err instanceof Error ? err.message : "Kayıt yüklenemedi"}`
      );
      setImporting(false);
    }
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
          {llm?.byPurpose && llm.byPurpose.length > 0 && (
            <div className="mt-4 border-t border-surface-2 pt-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Çağrı dağılımı
              </h3>
              <dl className="grid grid-cols-2 gap-y-1 text-sm">
                {llm.byPurpose.map((p) => (
                  <div key={p.purpose} className="contents">
                    <dt className="text-ink-soft">{p.purpose}</dt>
                    <dd>
                      {p.calls} çağrı{" "}
                      <span className="text-ink-soft">
                        (${p.usd.toFixed(2)})
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
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

        <section className="rounded-cozy bg-surface p-6 shadow-cozy">
          <h2 className="mb-1 font-semibold">Kayıt ve Yedekleme</h2>
          <p className="mb-3 text-sm text-ink-soft">
            Tüm ilerlemeni tek dosyaya indir, başka bir bilgisayarda yükleyip
            kaldığın yerden devam et. Dosyayı Drive veya USB ile taşıyabilirsin.
          </p>
          <div className="flex flex-wrap gap-3">
            <CozyButton
              variant="soft"
              onClick={() => {
                window.location.href = "/api/save/export";
              }}
            >
              ⬇️ Kaydı indir
            </CozyButton>
            <CozyButton
              variant="soft"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? "Yükleniyor..." : "⬆️ Kaydı yükle"}
            </CozyButton>
            <input
              ref={fileInputRef}
              type="file"
              accept=".db"
              className="hidden"
              onChange={onImportFile}
            />
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            Yükleme, bu makinedeki mevcut ilerlemeyi <strong>siler</strong> ve
            yüklenen kayıtla değiştirir. İki makinede de uygulamanın aynı sürümü
            kurulu olmalı.
          </p>
          {saveMsg && <p className="mt-3 text-sm">{saveMsg}</p>}
        </section>
      </main>
    </div>
  );
}
