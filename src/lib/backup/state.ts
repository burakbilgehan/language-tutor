// Backup bookkeeping — PURE logic + a thin localStorage wrapper.
//
// Scope fence (T-032): none of this may ride in the save image or the DB. If
// it did, the "back up your progress" reminder and the Drive lastSyncedAt would
// travel between devices and reset incoherently. So all of it lives in
// localStorage, keyed per browser. The pure functions here take state in and
// out so they unit-test without a browser; `readBackupState`/`writeBackupState`
// are the only parts that touch localStorage.

/** Persisted backup bookkeeping (localStorage). All timestamps are epoch ms. */
export interface BackupState {
  /** When progress was last exported/backed up anywhere (download OR Drive). */
  lastBackupAt: number | null;
  /** Completed-lesson count at the moment of the last backup. */
  lastBackupLessonCount: number;
  /** Newest save timestamp we know is on Drive (for newer-on-startup compare). */
  lastSyncedAt: number | null;
  /** User dismissed the reminder bar at this time — snooze the nudge. */
  reminderDismissedAt: number | null;
}

export const EMPTY_BACKUP_STATE: BackupState = {
  lastBackupAt: null,
  lastBackupLessonCount: 0,
  lastSyncedAt: null,
  reminderDismissedAt: null,
};

// Reminder thresholds. A nudge fires when EITHER enough days OR enough newly
// completed lessons have accumulated since the last backup — whichever comes
// first, so both the sporadic and the binge learner get reminded.
export const REMIND_AFTER_DAYS = 3;
export const REMIND_AFTER_LESSONS = 5;
/** Once dismissed, don't nag again for this long. */
export const REMIND_SNOOZE_DAYS = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RemindInput {
  state: BackupState;
  /** Current completed-lesson count. */
  lessonCount: number;
  now: number;
}

/**
 * Should the "back up your progress" bar show? True when there is unsaved
 * progress that has aged past a threshold and the user hasn't recently
 * dismissed the nudge. Pure — the caller supplies `now` and the live count.
 *
 * A nudge fires when EITHER enough new lessons piled up since the last backup,
 * OR enough days passed since the last backup while at least one new lesson was
 * done. For a never-backed-up profile the day clock has no anchor, so only the
 * lesson-count threshold applies there (a single lesson never nags; REMIND_AFTER
 * _LESSONS of them does).
 */
export function shouldRemind({ state, lessonCount, now }: RemindInput): boolean {
  // Nothing to lose yet: no lessons done at all.
  if (lessonCount <= 0) return false;

  // Snoozed after a recent dismissal.
  if (
    state.reminderDismissedAt !== null &&
    now - state.reminderDismissedAt < REMIND_SNOOZE_DAYS * DAY_MS
  ) {
    return false;
  }

  const lessonsSince = lessonCount - state.lastBackupLessonCount;
  if (lessonsSince <= 0) return false; // nothing new since last backup

  // Enough new lessons → remind regardless of clock (covers never-backed-up).
  if (lessonsSince >= REMIND_AFTER_LESSONS) return true;

  // Otherwise fall back to the day clock, which only exists once backed up.
  const since = state.lastBackupAt;
  if (since !== null && now - since >= REMIND_AFTER_DAYS * DAY_MS) return true;

  return false;
}

/** Record that a backup just happened (download or Drive upload). Pure. */
export function markBackedUp(
  state: BackupState,
  lessonCount: number,
  now: number,
  opts?: { synced?: boolean }
): BackupState {
  return {
    ...state,
    lastBackupAt: now,
    lastBackupLessonCount: lessonCount,
    lastSyncedAt: opts?.synced ? now : state.lastSyncedAt,
    reminderDismissedAt: null, // a real backup clears any snooze
  };
}

/** Record a dismissal (snooze). Pure. */
export function markDismissed(state: BackupState, now: number): BackupState {
  return { ...state, reminderDismissedAt: now };
}

// ---------------------------------------------------------------- localStorage

const LS_KEY = "backup-state";

export function readBackupState(): BackupState {
  if (typeof window === "undefined") return { ...EMPTY_BACKUP_STATE };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...EMPTY_BACKUP_STATE };
    const parsed = JSON.parse(raw) as Partial<BackupState>;
    return { ...EMPTY_BACKUP_STATE, ...parsed };
  } catch {
    return { ...EMPTY_BACKUP_STATE };
  }
}

export function writeBackupState(state: BackupState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    /* storage full / disabled — bookkeeping is best-effort */
  }
}
