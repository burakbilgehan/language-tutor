import { eq, sum } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as tables from "@/db/schema";
import type { AppDb } from "./db-types";

type XpReason = (typeof tables.xpEvents.$inferSelect)["reason"];

export function awardXp(
  db: AppDb,
  profileId: string,
  amount: number,
  reason: XpReason,
  refId?: string
) {
  db.insert(tables.xpEvents)
    .values({ id: nanoid(), profileId, amount, reason, refId })
    .run();
  bumpStreak(db, profileId);
}

export function totalXp(db: AppDb, profileId: string): number {
  const row = db
    .select({ total: sum(tables.xpEvents.amount) })
    .from(tables.xpEvents)
    .where(eq(tables.xpEvents.profileId, profileId))
    .get();
  return Number(row?.total ?? 0);
}

export function localDateStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function bumpStreak(db: AppDb, profileId: string) {
  const today = localDateStr();
  const yesterday = localDateStr(new Date(Date.now() - 86_400_000));
  const s = db
    .select()
    .from(tables.streaks)
    .where(eq(tables.streaks.profileId, profileId))
    .limit(1)
    .get();

  if (!s) {
    db.insert(tables.streaks)
      .values({
        profileId,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: today,
      })
      .run();
    return;
  }
  if (s.lastActivityDate === today) return;

  const current = s.lastActivityDate === yesterday ? s.currentStreak + 1 : 1;
  db.update(tables.streaks)
    .set({
      currentStreak: current,
      longestStreak: Math.max(current, s.longestStreak),
      lastActivityDate: today,
    })
    .where(eq(tables.streaks.profileId, profileId))
    .run();
}

export function getStreak(db: AppDb, profileId: string) {
  const s = db
    .select()
    .from(tables.streaks)
    .where(eq(tables.streaks.profileId, profileId))
    .limit(1)
    .get();
  if (!s) return { current: 0, longest: 0 };
  // A streak is only "alive" if last activity was today or yesterday.
  const today = localDateStr();
  const yesterday = localDateStr(new Date(Date.now() - 86_400_000));
  const alive =
    s.lastActivityDate === today || s.lastActivityDate === yesterday;
  return { current: alive ? s.currentStreak : 0, longest: s.longestStreak };
}
