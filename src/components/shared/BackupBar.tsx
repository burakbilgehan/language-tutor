"use client";

// Global backup overlay (T-032, static mode). Three jobs, all layout-level so
// they show on every page (StatsHeader is per-page):
//   1. On mount: request navigator.storage.persist() once (reduces the chance
//      the browser silently evicts IndexedDB) + check Drive for a newer save.
//   2. A gentle "back up your progress" reminder bar when the nudge is due.
//   3. A "reconnect Drive" prompt when an auto-upload got queued on a dead token.
// Server mode renders nothing (disk-persisted save + its own .bak).

import { useCallback, useEffect, useState } from "react";
import { IS_STATIC, saveExportApi } from "@/lib/client-api";
import { useStrings } from "@/lib/i18n/use-strings";
import { useBackup } from "@/lib/backup/use-backup";
import { readBackupState, writeBackupState, markDismissed } from "@/lib/backup/state";
import { emitBackupChange, flushPending, getDriveBackend } from "@/lib/backup/controller";
import { withBase } from "@/lib/base-path";

const S = {
  tr: {
    remindText: "İlerlemeni yedeklemeyi unutma — tek dokunuş yeter.",
    backup: "Yedekle",
    later: "Sonra",
    reauthText: "Drive bağlantın koptu — yeniden bağlanınca son yedek yüklenecek.",
    reconnect: "Yeniden bağlan",
    newerTitle: "Drive'da daha yeni bir kayıt var",
    newerText: "Başka bir cihazda daha yeni ilerleme kaydedilmiş. Yüklensin mi?",
    load: "Yükle",
    ignore: "Yoksay",
    loading: "Yükleniyor…",
  },
  en: {
    remindText: "Don't forget to back up your progress — one tap does it.",
    backup: "Back up",
    later: "Later",
    reauthText: "Drive disconnected — reconnect and your latest backup uploads.",
    reconnect: "Reconnect",
    newerTitle: "A newer save is on Drive",
    newerText: "Newer progress was saved on another device. Load it?",
    load: "Load",
    ignore: "Ignore",
    loading: "Loading…",
  },
};

export function BackupBar() {
  const t = useStrings(S);
  const backup = useBackup();
  const [newer, setNewer] = useState<{ id: string; at: number } | null>(null);
  const [busy, setBusy] = useState(false);

  // (1) One-time: persist request + silent Drive reconnect + newer-save check.
  useEffect(() => {
    if (!IS_STATIC) return;
    void requestPersist();
    void (async () => {
      await silentReconnect();
      emitBackupChange(); // reflect a restored session in the UI
      const { findRestoreCandidate, getLessonCount, autoUpload } = await import(
        "@/lib/backup/controller"
      );
      // Offer restore when Drive has a newer save OR the local DB is empty
      // (IndexedDB evicted but localStorage — and Drive — survived).
      const found = await findRestoreCandidate();
      setNewer(found);
      // No restore to offer + unsynced local progress → push it up so other
      // devices see it. Skip if nothing changed since the last backup.
      if (!found) {
        const st = readBackupState();
        if (getLessonCount() > st.lastBackupLessonCount) {
          void autoUpload().catch(() => {});
        }
      }
    })().catch(() => {});
  }, []);

  const onBackup = useCallback(async () => {
    setBusy(true);
    try {
      await saveExportApi();
    } finally {
      setBusy(false);
    }
  }, []);

  const onDismiss = useCallback(() => {
    writeBackupState(markDismissed(readBackupState(), Date.now()));
    emitBackupChange();
  }, []);

  const onReconnect = useCallback(async () => {
    setBusy(true);
    try {
      await flushPending();
    } catch {
      /* user cancelled or still failing */
    } finally {
      setBusy(false);
    }
  }, []);

  const onLoadNewer = useCallback(async () => {
    if (!newer) return;
    setBusy(true);
    try {
      const { restoreFromDrive } = await import("@/lib/backup/controller");
      await restoreFromDrive(newer);
      window.location.href = withBase("/map"); // full reload → fresh reads
    } finally {
      setBusy(false);
    }
  }, [newer]);

  if (!IS_STATIC) return null;

  // Priority: newer-save prompt > reconnect > reminder (one bar at a time).
  const show = newer
    ? "newer"
    : backup.needsReauth
      ? "reauth"
      : backup.remind
        ? "remind"
        : null;
  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3">
      <div className="flex w-full max-w-2xl flex-wrap items-center gap-3 rounded-cozy bg-surface px-4 py-3 shadow-cozy ring-1 ring-surface-2">
        {show === "newer" && (
          <>
            <span className="min-w-0 flex-1 text-sm">
              <strong className="font-semibold">{t.newerTitle}.</strong>{" "}
              {t.newerText}
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onLoadNewer()}
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-surface shadow-cozy transition-colors hover:brightness-105 disabled:opacity-60"
            >
              {busy ? t.loading : t.load}
            </button>
            <button
              type="button"
              onClick={() => setNewer(null)}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-2"
            >
              {t.ignore}
            </button>
          </>
        )}
        {show === "reauth" && (
          <>
            <span className="min-w-0 flex-1 text-sm">{t.reauthText}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onReconnect()}
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-surface shadow-cozy transition-colors hover:brightness-105 disabled:opacity-60"
            >
              {t.reconnect}
            </button>
          </>
        )}
        {show === "remind" && (
          <>
            <span className="min-w-0 flex-1 text-sm">{t.remindText}</span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onBackup()}
              className="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-surface shadow-cozy transition-colors hover:brightness-105 disabled:opacity-60"
            >
              {t.backup}
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-2"
            >
              {t.later}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---- helpers ----------------------------------------------------------------

/** Attempt a silent Drive reconnect (no popup) if the user linked before. */
async function silentReconnect(): Promise<void> {
  try {
    const be = getDriveBackend() as { tryReconnect?: () => Promise<boolean> } | null;
    if (be?.tryReconnect) await be.tryReconnect();
  } catch {
    /* offline / session gone — user can reconnect manually */
  }
}

async function requestPersist(): Promise<void> {
  try {
    if (!navigator.storage?.persist) return;
    if (await navigator.storage.persisted()) return; // already granted
    await navigator.storage.persist();
  } catch {
    /* best-effort */
  }
}
