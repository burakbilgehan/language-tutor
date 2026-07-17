import { eq } from "drizzle-orm";
import { db, tables } from "@/db";

export type Profile = typeof tables.profiles.$inferSelect;

/**
 * The single "active" profile drives everything: map, lessons, grammar, SRS,
 * chat. Switching language = switching active profile. Self-heals databases
 * created before the is_active flag existed by promoting the first profile.
 */
export function getActiveProfile(): Profile | null {
  const active = db.query.profiles
    .findFirst({ where: eq(tables.profiles.isActive, true) })
    .sync();
  if (active) return active;

  const first = db.query.profiles.findFirst().sync();
  if (!first) return null;
  db.update(tables.profiles)
    .set({ isActive: true })
    .where(eq(tables.profiles.id, first.id))
    .run();
  return { ...first, isActive: true };
}

export function setActiveProfile(profileId: string): Profile | null {
  const target = db.query.profiles
    .findFirst({ where: eq(tables.profiles.id, profileId) })
    .sync();
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
