import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getJob, recoverStaleJobs } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAuth(req);
  if (denied) return denied;

  recoverStaleJobs();
  const { id } = await params;
  const job = getJob(id);
  if (!job) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    id: job.id,
    status: job.status,
    error: job.error,
  });
}
