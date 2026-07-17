import { db } from "@/db";
import * as core from "@/core/struggles";

// Sunucu tarafı sarmalayıcı: iş mantığı src/core/struggles.ts'te.

export function getStrugglesLine(profileId: string): string | null {
  return core.getStrugglesLine(db, profileId);
}
