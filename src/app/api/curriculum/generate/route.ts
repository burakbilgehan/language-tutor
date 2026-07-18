import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { createJob, runJob, recoverStaleJobs } from "@/lib/jobs";
import { firstLevel } from "@/lib/curriculum/levels";
import { requireLlm } from "@/lib/llm/require-llm";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const gate = requireLlm();
  if (gate) return gate;
  recoverStaleJobs();
  const parsed = z
    .object({ profileId: z.string() })
    .safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "profileId gerekli" }, { status: 400 });
  }
  const { profileId } = parsed.data;

  const profile = db.query.profiles
    .findFirst({ where: eq(tables.profiles.id, profileId) })
    .sync();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }

  // First chapter of the profile's level scheme (N5 / HSK1 / A1). Same
  // (jobType, refId) namespace as extend/auto-extend so all chapter enqueue
  // paths dedupe against each other; createJob itself returns the in-flight
  // job id if one exists.
  const jobId = createJob(
    "chapter",
    `${profileId}:${firstLevel(profile.targetLanguage)}`
  );
  void runJob(jobId); // fire-and-forget; client polls /api/jobs/[id]
  return NextResponse.json({ jobId });
}
