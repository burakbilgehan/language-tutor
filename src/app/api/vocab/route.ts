import { NextResponse } from "next/server";
import { db } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { listVocab } from "@/core/vocab";
import { recoverStaleJobs } from "@/lib/jobs";

export const runtime = "nodejs";

// Deliberately NO auto-queue on list open (unlike /api/kanji): vocab is
// ~5000 entries — generation is user-triggered only, like grammar.
export async function GET() {
  recoverStaleJobs();
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }
  return NextResponse.json({
    entries: listVocab(db, profile.targetLanguage),
  });
}
