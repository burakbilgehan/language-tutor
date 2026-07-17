import { eq } from "drizzle-orm";
import * as tables from "@/db/schema";
import type { AppDb } from "./db-types";

export type Profile = typeof tables.profiles.$inferSelect;

/**
 * The single "active" profile drives everything: map, lessons, grammar, SRS,
 * chat. Switching language = switching active profile. Self-heals databases
 * created before the is_active flag existed by promoting the first profile.
 */
export function getActiveProfile(db: AppDb): Profile | null {
  const active = db
    .select()
    .from(tables.profiles)
    .where(eq(tables.profiles.isActive, true))
    .limit(1)
    .get();
  if (active) return active;

  const first = db.select().from(tables.profiles).limit(1).get();
  if (!first) return null;
  db.update(tables.profiles)
    .set({ isActive: true })
    .where(eq(tables.profiles.id, first.id))
    .run();
  return { ...first, isActive: true };
}

export function setActiveProfile(db: AppDb, profileId: string): Profile | null {
  const target = db
    .select()
    .from(tables.profiles)
    .where(eq(tables.profiles.id, profileId))
    .limit(1)
    .get();
  if (!target) return null;
  db.transaction((tx) => {
    tx.update(tables.profiles).set({ isActive: false }).run();
    tx.update(tables.profiles)
      .set({ isActive: true })
      .where(eq(tables.profiles.id, profileId))
      .run();
  });
  return { ...target, isActive: true };
}
