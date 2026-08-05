import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { createJob, runJob, recoverStaleJobs } from "@/lib/jobs";
import { firstLevel, isLevelOf } from "@/lib/curriculum/levels";
import { requireLlm } from "@/lib/llm/require-llm";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const gate = requireLlm();
  if (gate) return gate;
  recoverStaleJobs();
  const parsed = z
    .object({ profileId: z.string(), level: z.string().nullish() })
    .safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "profileId gerekli" }, { status: 400 });
  }
  const { profileId } = parsed.data;

  const profile = db.query.profiles
    .findFirst({ where: eq(tables.profiles.id, profileId) })
    .sync();
  if (!profile) {
    return NextResponse.json({ error: "profile_missing" }, { status: 404 });
  }

  // Starting level. Default = the first chapter of the profile's level scheme
  // (N5 / HSK1 / A1), which is the pre-T-082 behavior every existing caller
  // gets by sending no `level`. An explicit level (T-082's regenerate flow)
  // starts the curriculum mid-scheme; earlier levels are simply never
  // generated, and auto-extend chains forward from there via
  // topChapterLevel + nextLevelFor, so progression is unaffected.
  const startLevel = parsed.data.level ?? null;
  if (startLevel && !isLevelOf(profile.targetLanguage, startLevel)) {
    return NextResponse.json({ error: "invalid_level" }, { status: 400 });
  }

  // Same (jobType, refId) namespace as extend/auto-extend so all chapter
  // enqueue paths dedupe against each other; createJob itself returns the
  // in-flight job id if one exists.
  const jobId = createJob(
    "chapter",
    `${profileId}:${startLevel ?? firstLevel(profile.targetLanguage)}`
  );
  void runJob(jobId); // fire-and-forget; client polls /api/jobs/[id]
  return NextResponse.json({ jobId });
}
