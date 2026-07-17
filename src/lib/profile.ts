import { db } from "@/db";
import * as core from "@/core/profile";

// Sunucu tarafı sarmalayıcı: iş mantığı src/core/profile.ts'te (ortam
// bağımsız), burası sunucu db'sini bağlar. Route'lardaki import imzaları
// değişmedi.

export type Profile = core.Profile;

export function getActiveProfile(): Profile | null {
  return core.getActiveProfile(db);
}

export function setActiveProfile(profileId: string): Profile | null {
  return core.setActiveProfile(db, profileId);
}
