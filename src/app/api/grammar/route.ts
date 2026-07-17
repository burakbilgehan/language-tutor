import { NextResponse } from "next/server";
import { db } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { listGrammarTopics } from "@/core/grammar";
import { recoverStaleJobs } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET() {
  recoverStaleJobs();
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }
  return NextResponse.json({
    topics: listGrammarTopics(db, profile.targetLanguage),
  });
}
