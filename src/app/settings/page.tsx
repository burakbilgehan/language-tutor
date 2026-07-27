"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StatsHeader } from "@/components/shared/StatsHeader";
import { CozyButton } from "@/components/shared/CozyButton";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { LlmSettingsSection } from "@/components/settings/LlmSettingsSection";
import { JobQueuePanel } from "@/components/settings/JobQueuePanel";
import { CloudAccountSection } from "@/components/settings/CloudAccountSection";
import { useStrings } from "@/lib/i18n/use-strings";
import { useLocalizeError } from "@/lib/i18n/use-localize-error";
import { useTheme } from "@/lib/use-theme";
import { AppError } from "@/lib/errors";
import { stats, saveExportApi, saveImportApi, cloudPush } from "@/lib/client-api";
import { fetchAuthStatus } from "@/lib/auth-status";
import { describeCloudError } from "@/lib/cloud-error";
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
      "Tüm ilerlemeni tek dosyaya indir, başka bir bilgisayarda yükleyip kaldığın yerden devam et. Dosyayı bulut deposu ya da USB ile taşıyabilirsin.",
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
    // T-049 fix 2: the import→push bridge. A signed-in user who loads a save
    // file here has fresh local data the cloud does not have; without this the
    // only way to reconcile is to notice the cloud section further down.
    pushOfferTitle: "Kayıt yüklendi ✅",
    pushOfferDesc:
      "Giriş yapmış durumdasın — bu kaydı buluta da gönderebilirsin.",
    pushOfferButton: "⬆️ Buluta gönder",
    pushOfferPushing: "Gönderiliyor…",
    pushOfferSkip: "Şimdilik geç",
    pushOfferContinue: "Devam et",
    pushOfferDone: "✅ Buluta gönderildi.",
    pushOfferConfirm:
      "Buluttaki kaydın bu cihazdaki (yeni yüklenen) kayıtla değiştirilecek. Devam edilsin mi?",
    pushOfferFailed: "❌ Buluta gönderilemedi.",
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
      "Download all your progress as a single file, load it on another computer, and pick up where you left off. You can move the file via cloud storage or USB.",
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
    pushOfferTitle: "Save loaded ✅",
    pushOfferDesc:
      "You're signed in — you can send this save to the cloud as well.",
    pushOfferButton: "⬆️ Send to cloud",
    pushOfferPushing: "Sending…",
    pushOfferSkip: "Not now",
    pushOfferContinue: "Continue",
    pushOfferDone: "✅ Sent to the cloud.",
    pushOfferConfirm:
      "Your cloud save will be replaced with the (just-loaded) save on this device. Continue?",
    pushOfferFailed: "❌ Could not send to the cloud.",
    sourcesLink: "Sources & Licenses",
  },
};

export default function SettingsPage() {
  const t = useStrings(S);
  const localize = useLocalizeError();
  const { dark, toggle: toggleDark } = useTheme();
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
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  // T-049 fix 2: non-null once an import succeeded while signed in.
  const [pushOffer, setPushOffer] = useState<
    null | "idle" | "pushing" | "done"
  >(null);

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    const ok = window.confirm(t.importConfirm);
    if (!ok) return;

    setImporting(true);
    setSaveMsg(null);
    // Clear any offer from a PREVIOUS import: without this a second import
    // while the offer is on screen changes nothing visually, and the user
    // would push file B believing they pushed file A.
    setPushOffer(null);
    try {
      await saveImportApi(file);
      // Signed in → offer to push the freshly-imported save before leaving the
      // page; the cloud still holds the OLD save and nothing else would tell
      // the user that. Signed-out / no backend behaves exactly as before.
      // Awaited, not the hook snapshot — see fetchAuthStatus's doc comment.
      const auth = await fetchAuthStatus();
      if (auth.backendAvailable && auth.user) {
        setImporting(false);
        setPushOffer("idle");
        return;
      }
      window.location.href = withBase("/map"); // full reload → fresh reads
    } catch (err) {
      setSaveMsg(
        `❌ ${err instanceof AppError ? localize(err) : t.saveImportFailed}`
      );
      setImporting(false);
    }
  };

  // Unlike the onboarding bridge, this one KEEPS a confirm: here the cloud may
  // already hold a real save (possibly from another device) that this push
  // would overwrite, and the user did not necessarily arrive via a sign-in.
  const onPushAfterImport = async () => {
    if (!window.confirm(t.pushOfferConfirm)) return;
    setPushOffer("pushing");
    setSaveMsg(null);
    try {
      await cloudPush();
      setPushOffer("done");
    } catch (err) {
      const { kind } = describeCloudError(err);
      setSaveMsg(`${t.pushOfferFailed} (${kind})`);
      setPushOffer("idle");
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

        {/* T-060: the wizard IS the LLM surface now (the old LlmProviderSection
            melted into its "Gelişmiş" accordion). The Settings embed wraps it
            so finishing collapses to a summary instead of silently bouncing
            back to the doors. */}
        <LlmSettingsSection />

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
              disabled={importing || pushOffer === "pushing"}
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

          {/* T-049 fix 2: import→push bridge. Inline and dismissible; the
              destructive part (overwriting the cloud save) is still behind a
              confirm inside onPushAfterImport. */}
          {pushOffer !== null && (
            <div className="mt-4 rounded-xl border-2 border-accent/40 bg-accent-soft/20 px-4 py-3">
              <div className="font-semibold">{t.pushOfferTitle}</div>
              {pushOffer === "done" ? (
                <>
                  <p className="mt-1 mb-3 text-sm text-ink-soft">
                    {t.pushOfferDone}
                  </p>
                  <CozyButton
                    onClick={() => {
                      window.location.href = withBase("/map");
                    }}
                  >
                    {t.pushOfferContinue}
                  </CozyButton>
                </>
              ) : (
                <>
                  <p className="mt-1 mb-3 text-sm text-ink-soft">
                    {t.pushOfferDesc}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <CozyButton
                      onClick={() => void onPushAfterImport()}
                      disabled={pushOffer === "pushing"}
                    >
                      {pushOffer === "pushing"
                        ? t.pushOfferPushing
                        : t.pushOfferButton}
                    </CozyButton>
                    <CozyButton
                      variant="ghost"
                      disabled={pushOffer === "pushing"}
                      onClick={() => {
                        window.location.href = withBase("/map");
                      }}
                    >
                      {t.pushOfferSkip}
                    </CozyButton>
                  </div>
                </>
              )}
            </div>
          )}

          {saveMsg && <p className="mt-3 text-sm">{saveMsg}</p>}
        </section>

        {/* Cloud account + manual push/pull (T-046/T-047, surfaced by T-048).
            The only remote backup since T-050 removed the Google Drive leg;
            the file export/import above stays the anonymous path. Static only. */}
        <CloudAccountSection />

        <Link href="/about" className="text-sm text-indigo underline">
          {t.sourcesLink}
        </Link>
      </main>
    </div>
  );
}
