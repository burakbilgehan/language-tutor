"use client";

import { useCallback, useEffect, useState } from "react";
import { IS_STATIC } from "@/lib/client-api";
import { readBackupState, shouldRemind } from "./state";
import { readSyncQueue } from "./sync-queue";
import {
  getLessonCount,
  subscribeBackup,
  getDriveBackend,
} from "./controller";

export interface BackupView {
  /** Reminder bar should show. */
  remind: boolean;
  /** Completed lessons since the last backup (for copy). */
  lessonsSinceBackup: number;
  /** Drive configured (client id present)? */
  driveConfigured: boolean;
  /** Drive session live? */
  driveConnected: boolean;
  /** A backup is queued waiting on re-auth. */
  needsReauth: boolean;
  lastBackupAt: number | null;
}

/** Reactive view of backup state; re-reads on controller events. */
export function useBackup(): BackupView {
  const compute = useCallback((): BackupView => {
    const state = readBackupState();
    const queue = readSyncQueue();
    const lessonCount = getLessonCount();
    const be = IS_STATIC ? getDriveBackend() : null;
    return {
      remind:
        IS_STATIC &&
        shouldRemind({ state, lessonCount, now: Date.now() }),
      lessonsSinceBackup: Math.max(0, lessonCount - state.lastBackupLessonCount),
      driveConfigured: Boolean(be),
      driveConnected: be?.isConnected() ?? false,
      needsReauth: queue.needsReauth,
      lastBackupAt: state.lastBackupAt,
    };
  }, []);

  const [view, setView] = useState<BackupView>(() =>
    typeof window === "undefined"
      ? {
          remind: false,
          lessonsSinceBackup: 0,
          driveConfigured: false,
          driveConnected: false,
          needsReauth: false,
          lastBackupAt: null,
        }
      : compute()
  );

  useEffect(() => {
    setView(compute());
    return subscribeBackup(() => setView(compute()));
  }, [compute]);

  return view;
}
