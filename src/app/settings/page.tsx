"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { CozyButton } from "@/components/shared/CozyButton";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { LlmProviderSection } from "@/components/settings/LlmProviderSection";
import { JobQueuePanel } from "@/components/settings/JobQueuePanel";
import { BackupSection } from "@/components/settings/BackupSection";
import { useStrings } from "@/lib/i18n/use-strings";
import { useLocalizeError } from "@/lib/i18n/use-localize-error";
import { AppError } from "@/lib/errors";
import { stats, saveExportApi, saveImportApi } from "@/lib/client-api";
import { withBase } from "@/lib/base-path";

const S = {
  tr: {
    title: "Ayarlar",
    appearance: "Görünüm",
    lightTheme: "☀️ Açık tema",
    darkTheme: "🌙 Koyu tema",
    llmSpend: "LLM Harcaması",
    today: "Bugün",
    total: "Toplam",
    callsParen: (n: number) => `(${n} çağrı)`,
    noCalls: "Henüz kayıtlı çağrı yok.",
    callBreakdown: "Çağrı dağılımı",
    callsCount: (n: number) => `${n} çağrı`,
    billingNote:
      "Max aboneliği kullanıldığı için bu tutar faturalandırılmaz — API ile yapılsaydı ne tutacağını gösterir (CLI'ın raporladığı değer).",
    llmConnection: "LLM Bağlantısı",
    connBefore:
      "Claude CLI üzerinden Max aboneliğinle çalışır. Sorun yaşarsan terminalde",
    connAfter: "çalıştırıp giriş yaptığından emin ol.",
    checking: "Kontrol ediliyor...",
    testConnection: "Bağlantıyı test et",
    healthOk: (s: string) => `✅ Bağlantı sağlıklı (${s}s)`,
    connectionIssue: "Bağlantı sorunu",
    serverUnreachable: "❌ Sunucuya ulaşılamadı",
    saveTitle: "Kayıt ve Yedekleme",
    saveDesc:
      "Tüm ilerlemeni tek dosyaya indir, başka bir bilgisayarda yükleyip kaldığın yerden devam et. Dosyayı Drive veya USB ile taşıyabilirsin.",
    download: "⬇️ Kaydı indir",
    upload: "⬆️ Kaydı yükle",
    uploading: "Yükleniyor...",
    importConfirm:
      "Bu, bu makinedeki tüm ilerlemeyi silip yüklenen kayıtla değiştirir. Emin misin?",
    importFailed: "Yüklenemedi",
    saveImportFailed: "Kayıt yüklenemedi",
    importWarnBefore: "Yükleme, bu makinedeki mevcut ilerlemeyi",
    importWarnStrong: "siler",
    importWarnAfter:
      "ve yüklenen kayıtla değiştirir. İki makinede de uygulamanın aynı sürümü kurulu olmalı.",
    sourcesLink: "Kaynaklar & Lisanslar",
  },
  en: {
    title: "Settings",
    appearance: "Appearance",
    lightTheme: "☀️ Light theme",
    darkTheme: "🌙 Dark theme",
    llmSpend: "LLM Spend",
    today: "Today",
    total: "Total",
    callsParen: (n: number) => `(${n} calls)`,
    noCalls: "No recorded calls yet.",
    callBreakdown: "Call breakdown",
    callsCount: (n: number) => `${n} calls`,
    billingNote:
      "Since the Max subscription is used, this amount is not billed — it shows what it would cost via the API (as reported by the CLI).",
    llmConnection: "LLM Connection",
    connBefore:
      "Runs through the Claude CLI with your Max subscription. If you run into issues, run",
    connAfter: "in a terminal and make sure you're logged in.",
    checking: "Checking...",
    testConnection: "Test connection",
    healthOk: (s: string) => `✅ Connection healthy (${s}s)`,
    connectionIssue: "Connection problem",
    serverUnreachable: "❌ Could not reach the server",
    saveTitle: "Save & Backup",
    saveDesc:
      "Download all your progress as a single file, load it on another computer, and pick up where you left off. You can move the file via Drive or USB.",
    download: "⬇️ Download save",
    upload: "⬆️ Load save",
    uploading: "Loading...",
    importConfirm:
      "This will erase all progress on this machine and replace it with the loaded save. Are you sure?",
    importFailed: "Could not load",
    saveImportFailed: "Could not load the save",
    importWarnBefore: "Loading",
    importWarnStrong: "erases",
    importWarnAfter:
      "the current progress on this machine and replaces it with the loaded save. Both machines must have the same version of the app installed.",
    sourcesLink: "Sources & Licenses",
  },
};

export default function SettingsPage() {
  const t = useStrings(S);
  const localize = useLocalizeError();
  const [dark, setDark] = useState(false);
  const [llm, setLlm] = useState<{
    todayUsd: number;
    todayCalls: number;
    totalUsd: number;
    totalCalls: number;
    byPurpose?: { purpose: string; calls: number; usd: number }[];
  } | null>(null);

  useEffect(() => {
    stats()
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
    const ok = window.confirm(t.importConfirm);
    if (!ok) return;

    setImporting(true);
    setSaveMsg(null);
    try {
      await saveImportApi(file);
      window.location.href = withBase("/map"); // full reload → fresh reads
    } catch (err) {
      setSaveMsg(
        `❌ ${err instanceof AppError ? localize(err) : t.saveImportFailed}`
      );
      setImporting(false);
    }
  };

  return (
    <div className="min-h-dvh pb-16">
      <StatsHeader title={t.title} />
      <main className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-8">
        <ProfileSection />

        <section className="rounded-cozy bg-surface p-6 shadow-cozy">
          <h2 className="mb-3 font-semibold">{t.appearance}</h2>
          <CozyButton variant="soft" onClick={toggleDark}>
            {dark ? t.lightTheme : t.darkTheme}
          </CozyButton>
        </section>

        <section className="rounded-cozy bg-surface p-6 shadow-cozy">
          <h2 className="mb-3 font-semibold">{t.llmSpend}</h2>
          {llm ? (
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-ink-soft">{t.today}</dt>
              <dd>
                ${llm.todayUsd.toFixed(2)}{" "}
                <span className="text-ink-soft">
                  {t.callsParen(llm.todayCalls)}
                </span>
              </dd>
              <dt className="text-ink-soft">{t.total}</dt>
              <dd>
                ${llm.totalUsd.toFixed(2)}{" "}
                <span className="text-ink-soft">
                  {t.callsParen(llm.totalCalls)}
                </span>
              </dd>
            </dl>
          ) : (
            <p className="text-sm text-ink-soft">{t.noCalls}</p>
          )}
          {llm?.byPurpose && llm.byPurpose.length > 0 && (
            <div className="mt-4 border-t border-surface-2 pt-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                {t.callBreakdown}
              </h3>
              <dl className="grid grid-cols-2 gap-y-1 text-sm">
                {llm.byPurpose.map((p) => (
                  <div key={p.purpose} className="contents">
                    <dt className="text-ink-soft">{p.purpose}</dt>
                    <dd>
                      {t.callsCount(p.calls)}{" "}
                      <span className="text-ink-soft">
                        (${p.usd.toFixed(2)})
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <p className="mt-3 text-xs text-ink-soft">{t.billingNote}</p>
        </section>

        <LlmProviderSection />

        <JobQueuePanel />

        <section className="rounded-cozy bg-surface p-6 shadow-cozy">
          <h2 className="mb-1 font-semibold">{t.saveTitle}</h2>
          <p className="mb-3 text-sm text-ink-soft">{t.saveDesc}</p>
          <div className="flex flex-wrap gap-3">
            <CozyButton
              variant="soft"
              onClick={() => void saveExportApi()}
            >
              {t.download}
            </CozyButton>
            <CozyButton
              variant="soft"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              {importing ? t.uploading : t.upload}
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
            {t.importWarnBefore} <strong>{t.importWarnStrong}</strong>{" "}
            {t.importWarnAfter}
          </p>
          {saveMsg && <p className="mt-3 text-sm">{saveMsg}</p>}
        </section>

        {/* Drive sync + local snapshots (T-032) — static mode only. */}
        <BackupSection />

        <Link href="/about" className="text-sm text-ink-soft underline">
          {t.sourcesLink}
        </Link>
      </main>
    </div>
  );
}
