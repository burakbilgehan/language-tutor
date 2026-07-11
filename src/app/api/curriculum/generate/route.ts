import { NextResponse } from "next/server";
import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { db, tables } from "@/db";
import { createJob, runJob, recoverStaleJobs } from "@/lib/jobs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  recoverStaleJobs();
  const parsed = z
    .object({ profileId: z.string() })
    .safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "profileId gerekli" }, { status: 400 });
  }
  const { profileId } = parsed.data;

  // Guard: an in-flight curriculum job for this profile → return it.
  const existing = db.query.generationJobs
    .findFirst({
      where: and(
        eq(tables.generationJobs.jobType, "curriculum"),
        eq(tables.generationJobs.refId, profileId),
        inArray(tables.generationJobs.status, ["queued", "running"])
      ),
    })
    .sync();
  if (existing) return NextResponse.json({ jobId: existing.id });

  const jobId = createJob("curriculum", profileId);
  void runJob(jobId); // fire-and-forget; client polls /api/jobs/[id]
  return NextResponse.json({ jobId });
}
