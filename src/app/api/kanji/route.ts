import { NextResponse } from "next/server";
import { db } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { listKanji } from "@/core/kanji";
import { queueKanjiLevel, recoverStaleJobs, topChapterLevel } from "@/lib/jobs";
import { isJlptLevel, levelOrdinal, type JlptLevel } from "@/lib/curriculum/levels";
import { eq } from "drizzle-orm";
import { tables } from "@/db";

export const runtime = "nodejs";

export async function GET() {
  recoverStaleJobs();
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }
  const entries = listKanji(db, profile.targetLanguage);

  // Auto-fill: opening the kanji list starts generating the learner's current
  // level in the background so examples are ready by default. "Current" =
  // the LOWEST level that still has pending entries, capped at the top
  // curriculum chapter. Only 'pending' — errored entries need the explicit
  // per-level button, never a silent background retry. (Sunucuya özgü: LLM
  // job'u — statik mod tarayıcı LLM katmanıyla alacak.)
  const curriculum = db
    .select()
    .from(tables.curricula)
    .where(eq(tables.curricula.profileId, profile.id))
    .limit(1)
    .get();
  const top = curriculum
    ? topChapterLevel(curriculum.id, profile.targetLanguage)
    : null;
  if (top && isJlptLevel(top)) {
    const autoLevel = entries
      .filter((e) => e.status === "pending" && isJlptLevel(e.level))
      .map((e) => e.level as JlptLevel)
      .filter((l) => levelOrdinal(l) <= levelOrdinal(top))
      .sort((a, b) => levelOrdinal(a) - levelOrdinal(b))[0];
    if (autoLevel) queueKanjiLevel(profile.targetLanguage, autoLevel, false);
  }

  return NextResponse.json({ entries });
}
