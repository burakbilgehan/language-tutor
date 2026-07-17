import { db, tables } from "@/db";
import * as core from "@/core/xp";

// Sunucu tarafı sarmalayıcı: iş mantığı src/core/xp.ts'te (ortam bağımsız),
// burası sunucu db'sini bağlar. Route'lardaki import imzaları değişmedi.

type XpReason = (typeof tables.xpEvents.$inferSelect)["reason"];

export function awardXp(
  profileId: string,
  amount: number,
  reason: XpReason,
  refId?: string
) {
  core.awardXp(db, profileId, amount, reason, refId);
}

export function totalXp(profileId: string): number {
  return core.totalXp(db, profileId);
}

export const localDateStr = core.localDateStr;

export function bumpStreak(profileId: string) {
  core.bumpStreak(db, profileId);
}

export function getStreak(profileId: string) {
  return core.getStreak(db, profileId);
}
