"use client";

// Global backup overlay (T-032, static mode). Two jobs, both layout-level so
// they apply on every page (StatsHeader is per-page):
//   1. On mount: request navigator.storage.persist() once (reduces the chance
//      the browser silently evicts IndexedDB).
//   2. A gentle "back up your progress" reminder bar when the nudge is due.
// Server mode renders nothing (disk-persisted save + its own .bak).
//
// T-050: the Drive legs are gone — the "a newer save is on Drive" restore offer
// and the "reconnect Drive" re-auth prompt. They were NOT rewired to the cloud:
// a cloud remote-offer would mean a cloudInfo() HEAD on every page mount for
// every signed-in user, and the pull behind it is a destructive replace-all
// needing its own confirm. The cloud pull offer lives where T-048 put it — the
// OAuth return leg and the Settings cloud section.

import { useCallback, useEffect, useState } from "react";
import { saveExportApi } from "@/lib/client-api";
import { useStrings } from "@/lib/i18n/use-strings";
import { useBackup } from "@/lib/backup/use-backup";
import { readBackupState, writeBackupState, markDismissed } from "@/lib/backup/state";
import { emitBackupChange } from "@/lib/backup/controller";

const S = {
  tr: {
    remindText: "İlerlemeni yedeklemeyi unutma — tek dokunuş yeter.",
    backup: "Yedekle",
    later: "Sonra",
  },
  en: {
    remindText: "Don't forget to back up your progress — one tap does it.",
    backup: "Back up",
    later: "Later",
  },
};

export function BackupBar() {
  const t = useStrings(S);
  const backup = useBackup();
  const [busy, setBusy] = useState(false);

  // (1) One-time: ask the browser to keep our IndexedDB image.
  useEffect(() => {
    void requestPersist();
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

  if (!backup.remind) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3">
      <div className="flex w-full max-w-2xl flex-wrap items-center gap-3 rounded-cozy bg-surface px-4 py-3 shadow-cozy ring-1 ring-surface-2">
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
      </div>
    </div>
  );
}

// ---- helpers ----------------------------------------------------------------

async function requestPersist(): Promise<void> {
  try {
    if (!navigator.storage?.persist) return;
    if (await navigator.storage.persisted()) return; // already granted
    await navigator.storage.persist();
  } catch {
    /* best-effort */
  }
}
