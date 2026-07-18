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

/** Müfredatı OLAN profillerin dilleri — onboarding "bu dil kullanımda"
 * kilidi buna bakar. Müfredatsız (yarım kalmış) profil dili kilitlemez;
 * yeniden onboard edilir (createOrReuseProfile devralır). */
export function languagesWithCurriculum(db: AppDb): string[] {
  const rows = db
    .select({ targetLanguage: tables.profiles.targetLanguage })
    .from(tables.profiles)
    .innerJoin(
      tables.curricula,
      eq(tables.curricula.profileId, tables.profiles.id)
    )
    .all();
  return [...new Set(rows.map((r) => r.targetLanguage))];
}

/** Onboarding submit'ini idempotent yapar: aynı dil için MÜFREDATSIZ profil
 * varsa (yarım kalmış onboarding — profil yazıldı, müfredat üretimi LLM
 * yokken patladı) draft'la güncelleyip yeniden kullanır; müfredatlıysa
 * duplicate döner (409 kararı çağıranda). */
export function createOrReuseProfile(
  db: AppDb,
  input: Omit<ProfileInsert, "id">
): { profile: Profile | null; duplicate: boolean } {
  const existing = findProfileByLanguage(db, input.targetLanguage);
  if (existing) {
    const hasCurriculum =
      db
        .select({ id: tables.curricula.id })
        .from(tables.curricula)
        .where(eq(tables.curricula.profileId, existing.id))
        .limit(1)
        .get() != null;
    if (hasCurriculum) return { profile: null, duplicate: true };
    // targetLanguage aynı (findProfileByLanguage bununla buldu) — patch dışı.
    const patch: Partial<ProfileInsert> = { ...input };
    delete patch.targetLanguage;
    db.update(tables.profiles)
      .set(patch)
      .where(eq(tables.profiles.id, existing.id))
      .run();
    return { profile: setActiveProfile(db, existing.id), duplicate: false };
  }
  return { profile: createProfile(db, input), duplicate: false };
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
