import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveProfile } from "@/lib/profile";
import { queueKanjiLevel, recoverStaleJobs } from "@/lib/jobs";

export const runtime = "nodejs";

const Input = z.object({ level: z.string().min(1).max(8) });

/**
 * "Bu seviyeyi hazırla": queue LLM content for every pending/errored kanji of
 * a level. Explicit user action, so errored entries ARE retried here (unlike
 * the automatic current-level fill).
 */
export async function POST(req: Request) {
  recoverStaleJobs();
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }
  const parsed = Input.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz seviye" }, { status: 400 });
  }
  const queued = queueKanjiLevel(
    profile.targetLanguage,
    parsed.data.level,
    true
  );
  return NextResponse.json({ queued });
}
