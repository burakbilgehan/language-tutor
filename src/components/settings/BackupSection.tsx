"use client";

// Settings surface for T-032, STATIC MODE ONLY (server mode keeps its existing
// save section + on-disk .bak): Google Drive sync connect/disconnect and the
// last-K local IndexedDB snapshot list with restore. Server mode renders null.

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
import { connectDrive, getDriveBackend, emitBackupChange } from "@/lib/backup/controller";
import type { SnapshotMeta } from "@/db/browser";

const S = {
  tr: {
    driveTitle: "Google Drive Yedekleme",
    driveDesc:
      "İlerlemeni kendi Google Drive'ına otomatik yedekler (Drive'ının gizli uygulama klasörüne, senin kotanı kullanır). Ders bitişlerinde ve periyodik olarak yüklenir; başka bir cihazda daha yeni kayıt varsa açılışta sorulur.",
    clientIdLabel: "OAuth Client ID",
    clientIdPlaceholder: "xxxx.apps.googleusercontent.com",
    clientIdHelp:
      "Google Cloud'da kendi OAuth Client ID'ni oluşturup buraya yapıştır (adımlar: docs/drive-backup-setup.md). Secret gerekmez.",
    connect: "Drive'a bağlan",
    connecting: "Bağlanılıyor…",
    connected: "✅ Bağlı",
    disconnect: "Bağlantıyı kes",
    connectFailed: "Bağlanılamadı",
    save: "Kaydet",
    saved: "Kaydedildi",
    snapTitle: "Yerel Anlık Yedekler",
    snapDesc:
      "Bu tarayıcıda tutulan son otomatik kopyalar. Yanlış bir içe aktarma ya da hatalı tıklamayı buradan geri alabilirsin. (Tarayıcı verisi silinirse bunlar da gider — kalıcı yedek için Drive kullan.)",
    noSnaps: "Henüz anlık yedek yok.",
    restore: "Geri yükle",
    restoreConfirm:
      "Bu, mevcut ilerlemeyi seçilen anlık yedekle değiştirir. Devam edilsin mi?",
    restoring: "Yükleniyor…",
    take: "Şimdi bir kopya al",
  },
  en: {
    driveTitle: "Google Drive Backup",
    driveDesc:
      "Automatically backs up your progress to your own Google Drive (a hidden app folder on your Drive, using your quota). Uploads on lesson completion and periodically; on startup you're asked if a newer save exists on another device.",
    clientIdLabel: "OAuth Client ID",
    clientIdPlaceholder: "xxxx.apps.googleusercontent.com",
    clientIdHelp:
      "Create your own OAuth Client ID in Google Cloud and paste it here (steps: docs/drive-backup-setup.md). No secret needed.",
    connect: "Connect Drive",
    connecting: "Connecting…",
    connected: "✅ Connected",
    disconnect: "Disconnect",
    connectFailed: "Could not connect",
    save: "Save",
    saved: "Saved",
    snapTitle: "Local Snapshots",
    snapDesc:
      "The most recent automatic copies kept in this browser. Undo a bad import or a wrong click from here. (If browser data is cleared these go too — use Drive for durable backup.)",
    noSnaps: "No snapshots yet.",
    restore: "Restore",
    restoreConfirm:
      "This replaces your current progress with the selected snapshot. Continue?",
    restoring: "Restoring…",
    take: "Take a copy now",
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
  const [snaps, setSnaps] = useState<SnapshotMeta[]>([]);
  const [restoring, setRestoring] = useState(false);

  const loadSnaps = useCallback(async () => {
    const { listSnapshots } = await import("@/db/browser");
    setSnaps(await listSnapshots());
  }, []);

  useEffect(() => {
    if (!IS_STATIC) return;
    const id = readDriveClientId();
    setSavedId(id);
    setClientId(id ?? "");
    void loadSnaps();
  }, [loadSnaps]);

  const onSaveClientId = () => {
    writeDriveClientId(clientId);
    setSavedId(clientId.trim() || null);
    emitBackupChange();
    setMsg(t.saved);
  };

  const onConnect = async () => {
    setConnecting(true);
    setMsg(null);
    try {
      await connectDrive();
      setMsg(t.connected);
    } catch {
      setMsg(`❌ ${t.connectFailed}`);
    } finally {
      setConnecting(false);
    }
  };

  const onDisconnect = () => {
    getDriveBackend()?.disconnect();
    emitBackupChange();
    setMsg(null);
  };

  const onTakeSnap = async () => {
    const { getBrowserDb } = await import("@/db/browser");
    const handle = await getBrowserDb();
    await handle.persistNow();
    await handle.takeSnapshot();
    await loadSnaps();
  };

  const onRestore = async (key: string) => {
    if (!window.confirm(t.restoreConfirm)) return;
    setRestoring(true);
    try {
      const { getBrowserDb } = await import("@/db/browser");
      const handle = await getBrowserDb();
      await handle.restoreSnapshot(key);
      window.location.href = withBase("/map"); // full reload → fresh reads
    } finally {
      setRestoring(false);
    }
  };

  if (!IS_STATIC) return null;

  return (
    <>
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
      </section>

      <section className="rounded-cozy bg-surface p-6 shadow-cozy">
        <h2 className="mb-1 font-semibold">{t.snapTitle}</h2>
        <p className="mb-3 text-sm text-ink-soft">{t.snapDesc}</p>
        {snaps.length === 0 ? (
          <p className="text-sm text-ink-soft">{t.noSnaps}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {snaps.map((s) => (
              <li
                key={s.key}
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
                  onClick={() => void onRestore(s.key)}
                  className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold transition-colors hover:bg-surface disabled:opacity-60"
                >
                  {restoring ? t.restoring : t.restore}
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <CozyButton variant="soft" onClick={() => void onTakeSnap()}>
            {t.take}
          </CozyButton>
        </div>
      </section>
    </>
  );
}
