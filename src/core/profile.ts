import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as tables from "@/db/schema";
import type { AppDb } from "./db-types";

export type Profile = typeof tables.profiles.$inferSelect;
export type ProfileInsert = typeof tables.profiles.$inferInsert;

/** Yeni profil + streak satırı oluşturur ve aktif yapar. Dil çakışması
 * kontrolü çağıranda (409 kararı route/client-api'de verilir). */
export function createProfile(
  db: AppDb,
  input: Omit<ProfileInsert, "id">
): Profile | null {
  const id = nanoid();
  db.insert(tables.profiles)
    .values({ id, ...input })
    .run();
  db.insert(tables.streaks)
    .values({ profileId: id })
    .onConflictDoNothing()
    .run();
  return setActiveProfile(db, id);
}

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

/** Profil listesi (ayarlar/onboarding seçim ekranları için özet alanlar). */
export function listProfiles(db: AppDb) {
  return db
    .select({
      id: tables.profiles.id,
      displayName: tables.profiles.displayName,
      targetLanguage: tables.profiles.targetLanguage,
      selfLevel: tables.profiles.selfLevel,
      isActive: tables.profiles.isActive,
    })
    .from(tables.profiles)
    .all();
}

export function findProfileByLanguage(db: AppDb, targetLanguage: string) {
  return db
    .select()
    .from(tables.profiles)
    .where(eq(tables.profiles.targetLanguage, targetLanguage))
    .limit(1)
    .get();
}

export function updateActiveProfile(
  db: AppDb,
  patch: Partial<Omit<Profile, "id" | "targetLanguage">>
): Profile | null {
  const profile = getActiveProfile(db);
  if (!profile) return null;
  db.update(tables.profiles)
    .set(patch)
    .where(eq(tables.profiles.id, profile.id))
    .run();
  return { ...profile, ...patch };
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
