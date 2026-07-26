import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { resumePendingJobs } from "@/lib/jobs";

export const runtime = "nodejs";

/** Resume boot-recovered jobs awaiting approval ("devam et?"). */
export async function POST(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const resumed = resumePendingJobs();
  return NextResponse.json({ resumed });
}
