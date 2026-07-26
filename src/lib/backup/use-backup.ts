"use client";

import { useCallback, useEffect, useState } from "react";
import { IS_STATIC } from "@/lib/client-api";
import { readBackupState, shouldRemind } from "./state";
import { getLessonCount, subscribeBackup } from "./controller";

export interface BackupView {
  /** Reminder bar should show. */
  remind: boolean;
  /** Completed lessons since the last backup (for copy). */
  lessonsSinceBackup: number;
  lastBackupAt: number | null;
}

/** Reactive view of backup state; re-reads on controller events.
 *
 * T-050: the Drive fields (`driveConfigured`/`driveConnected`/`needsReauth`)
 * are gone with the Drive backend. The cloud account has its own UI state in
 * CloudAccountSection — it is manual push/pull, so it needs no ambient view. */
export function useBackup(): BackupView {
  const compute = useCallback((): BackupView => {
    const state = readBackupState();
    const lessonCount = getLessonCount();
    return {
      remind:
        IS_STATIC && shouldRemind({ state, lessonCount, now: Date.now() }),
      lessonsSinceBackup: Math.max(0, lessonCount - state.lastBackupLessonCount),
      lastBackupAt: state.lastBackupAt,
    };
  }, []);

  const [view, setView] = useState<BackupView>(() =>
    typeof window === "undefined"
      ? { remind: false, lessonsSinceBackup: 0, lastBackupAt: null }
      : compute()
  );

  useEffect(() => {
    setView(compute());
    return subscribeBackup(() => setView(compute()));
  }, [compute]);

  return view;
}
