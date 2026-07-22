"use client";

// Settings surface for T-032, STATIC MODE ONLY (server mode keeps its existing
// save section + on-disk .bak): Google Drive sync connect/disconnect + version
// list. Internal pre-restore safety snapshots still exist in src/db/browser.ts
// but have no user-facing surface (deliberate — see T-032 closure).

import { useCallback, useEffect, useState } from "react";
import { IS_STATIC } from "@/lib/client-api";
import { CozyButton } from "@/components/shared/CozyButton";
import { useStrings } from "@/lib/i18n/use-strings";
import { withBase } from "@/lib/base-path";
import { useBackup } from "@/lib/backup/use-backup";
import {
  readDriveClientId,
  writeDriveClientId,
} from "@/lib/backup/drive";
import {
  connectDrive,
  getDriveBackend,
  emitBackupChange,
  restoreFromDrive,
  type RestoreCandidate,
} from "@/lib/backup/controller";
import type { RemoteSave } from "@/lib/backup/backend";

const S = {
  tr: {
    driveTitle: "Google Drive Yedekleme",
    driveDesc:
      "İlerlemeni kendi Google Drive'ına otomatik yedekler (Drive'ının gizli uygulama klasörüne, senin kotanı kullanır). Ders bitişlerinde ve periyodik olarak yüklenir; başka bir cihazda daha yeni kayıt varsa açılışta sorulur.",
    clientIdLabel: "OAuth Client ID",
    clientIdPlaceholder: "xxxx.apps.googleusercontent.com",
    clientIdHelp:
      "Google Cloud'da kendi OAuth Client ID'ni oluşturup buraya yapıştır. Secret gerekmez, ücretsizdir.",
    setupSummary: "Client ID nasıl alınır? (adım adım)",
    setupSteps: [
      "console.cloud.google.com adresine gir, (gerekirse) yeni bir proje oluştur.",
      "\"APIs & Services → Library\"den Google Drive API'yi etkinleştir (Enable).",
      "\"APIs & Services → OAuth consent screen\": External seç; uygulama adı ve e-postanı yaz; Scopes adımında \"drive.appdata\" scope'unu ekle; Test users kısmına kendi Gmail adresini ekle ve durumu \"Testing\"de bırak (yayınlama/doğrulama gerekmez).",
      "\"APIs & Services → Credentials → Create Credentials → OAuth client ID\": tür olarak Web application seç.",
      "\"Authorized JavaScript origins\" alanına bu sitenin adresini ekle (adres çubuğundaki kök adres, ör. https://KULLANICI.github.io). Redirect URI gerekmez.",
      "Oluşan \"xxxx.apps.googleusercontent.com\" biçimindeki Client ID'yi kopyala, yukarıya yapıştır, Kaydet'e bas ve Drive'a bağlan.",
    ],
    connect: "Drive'a bağlan",
    connecting: "Bağlanılıyor…",
    connected: "✅ Bağlı",
    disconnect: "Bağlantıyı kes",
    connectFailed: "Bağlanılamadı",
    save: "Kaydet",
    saved: "Kaydedildi",
    restore: "Geri yükle",
    restoring: "Yükleniyor…",
    driveVersions: "Drive'daki sürümler",
    driveRestoreConfirm:
      "Bu, mevcut ilerlemeyi Drive'daki bu sürümle değiştirir. Devam edilsin mi?",
    noDriveVersions: "Drive'da kayıt yok.",
    refresh: "Yenile",
  },
  en: {
    driveTitle: "Google Drive Backup",
    driveDesc:
      "Automatically backs up your progress to your own Google Drive (a hidden app folder on your Drive, using your quota). Uploads on lesson completion and periodically; on startup you're asked if a newer save exists on another device.",
    clientIdLabel: "OAuth Client ID",
    clientIdPlaceholder: "xxxx.apps.googleusercontent.com",
    clientIdHelp:
      "Create your own OAuth Client ID in Google Cloud and paste it here. No secret needed, it's free.",
    setupSummary: "How do I get a Client ID? (step by step)",
    setupSteps: [
      "Go to console.cloud.google.com and create a new project (if needed).",
      "In \"APIs & Services → Library\", enable the Google Drive API.",
      "\"APIs & Services → OAuth consent screen\": choose External; fill in an app name and your email; in the Scopes step add the \"drive.appdata\" scope; add your own Gmail address under Test users and leave the status as \"Testing\" (no publishing/verification needed).",
      "\"APIs & Services → Credentials → Create Credentials → OAuth client ID\": choose Web application as the type.",
      "Under \"Authorized JavaScript origins\" add this site's address (the root address in your address bar, e.g. https://USER.github.io). No redirect URI needed.",
      "Copy the resulting Client ID (\"xxxx.apps.googleusercontent.com\"), paste it above, hit Save, then Connect Drive.",
    ],
    connect: "Connect Drive",
    connecting: "Connecting…",
    connected: "✅ Connected",
    disconnect: "Disconnect",
    connectFailed: "Could not connect",
    save: "Save",
    saved: "Saved",
    restore: "Restore",
    restoring: "Restoring…",
    driveVersions: "Versions on Drive",
    driveRestoreConfirm:
      "This replaces your current progress with this Drive version. Continue?",
    noDriveVersions: "No saves on Drive.",
    refresh: "Refresh",
  },
};

function fmt(ts: number): string {
  return new Date(ts).toLocaleString();
}
function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function BackupSection() {
  const t = useStrings(S);
  const backup = useBackup();
  const [clientId, setClientId] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [driveSaves, setDriveSaves] = useState<RemoteSave[] | null>(null);
  const [restoring, setRestoring] = useState(false);

  const loadDriveSaves = useCallback(async () => {
    const be = getDriveBackend();
    if (!be || !be.isConnected()) {
      setDriveSaves(null);
      return;
    }
    try {
      setDriveSaves(await be.list());
    } catch {
      setDriveSaves(null);
    }
  }, []);

  useEffect(() => {
    if (!IS_STATIC) return;
    const id = readDriveClientId();
    setSavedId(id);
    setClientId(id ?? "");
    void loadDriveSaves();
  }, [loadDriveSaves]);

  const onSaveClientId = () => {
    writeDriveClientId(clientId);
    setSavedId(clientId.trim() || null);
    emitBackupChange();
    setMsg(t.saved);
  };

  const doRestoreDrive = useCallback(async (cand: RestoreCandidate) => {
    setRestoring(true);
    try {
      await restoreFromDrive(cand);
      window.location.href = withBase("/map"); // full reload → fresh reads
    } finally {
      setRestoring(false);
    }
  }, []);

  const onConnect = async () => {
    setConnecting(true);
    setMsg(null);
    try {
      // connectDrive returns a restore candidate when Drive already holds a save
      // that should be offered BEFORE we upload local state (empty local / newer
      // remote) — otherwise it uploads and returns null.
      const candidate = await connectDrive();
      if (candidate && window.confirm(t.driveRestoreConfirm)) {
        await doRestoreDrive(candidate);
        return;
      }
      setMsg(t.connected);
      await loadDriveSaves();
    } catch {
      setMsg(`❌ ${t.connectFailed}`);
    } finally {
      setConnecting(false);
    }
  };

  const onDisconnect = () => {
    getDriveBackend()?.disconnect();
    setDriveSaves(null);
    emitBackupChange();
    setMsg(null);
  };

  const onRestoreDrive = async (s: RemoteSave) => {
    if (!window.confirm(t.driveRestoreConfirm)) return;
    await doRestoreDrive({ id: s.id, at: s.at });
  };

  if (!IS_STATIC) return null;

  return (
      <section className="rounded-cozy bg-surface p-6 shadow-cozy">
        <h2 className="mb-1 font-semibold">{t.driveTitle}</h2>
        <p className="mb-3 text-sm text-ink-soft">{t.driveDesc}</p>

        <label className="mb-1 block text-sm font-medium">
          {t.clientIdLabel}
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder={t.clientIdPlaceholder}
            className="min-w-0 flex-1 rounded-lg border border-surface-2 bg-background px-3 py-2 text-sm"
          />
          <CozyButton variant="soft" onClick={onSaveClientId}>
            {t.save}
          </CozyButton>
        </div>
        <p className="mt-2 text-xs text-ink-soft">{t.clientIdHelp}</p>
        <details className="mt-2 rounded-lg bg-background px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-ink-soft">
            {t.setupSummary}
          </summary>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs text-ink-soft">
            {t.setupSteps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </details>

        {savedId && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {backup.driveConnected ? (
              <>
                <span className="text-sm font-medium text-moss">
                  {t.connected}
                </span>
                <CozyButton variant="soft" onClick={onDisconnect}>
                  {t.disconnect}
                </CozyButton>
              </>
            ) : (
              <CozyButton
                variant="primary"
                onClick={() => void onConnect()}
                disabled={connecting}
              >
                {connecting ? t.connecting : t.connect}
              </CozyButton>
            )}
          </div>
        )}
        {msg && <p className="mt-3 text-sm">{msg}</p>}

        {backup.driveConnected && (
          <div className="mt-5 border-t border-surface-2 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                {t.driveVersions}
              </h3>
              <button
                type="button"
                onClick={() => void loadDriveSaves()}
                className="text-xs font-medium text-ink-soft hover:text-ink"
              >
                {t.refresh}
              </button>
            </div>
            {driveSaves && driveSaves.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {driveSaves.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background px-3 py-2 text-sm"
                  >
                    <span>
                      {fmt(s.at)}
                      {s.size != null && (
                        <span className="text-ink-soft"> ({fmtSize(s.size)})</span>
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={restoring}
                      onClick={() => void onRestoreDrive(s)}
                      className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold transition-colors hover:bg-surface disabled:opacity-60"
                    >
                      {restoring ? t.restoring : t.restore}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">{t.noDriveVersions}</p>
            )}
          </div>
        )}
      </section>
  );
}
