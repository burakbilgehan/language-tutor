import { NextResponse } from "next/server";
import { z } from "zod";
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

  // First chapter (N5). Same (jobType, refId) namespace as extend/auto-extend
  // so all chapter enqueue paths dedupe against each other; createJob itself
  // returns the in-flight job id if one exists.
  const jobId = createJob("chapter", `${profileId}:N5`);
  void runJob(jobId); // fire-and-forget; client polls /api/jobs/[id]
  return NextResponse.json({ jobId });
}
