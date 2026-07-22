import { NextResponse } from "next/server";
import { listJobs, recoverStaleJobs } from "@/lib/jobs";

export const runtime = "nodejs";

/**
 * Lightweight job-queue snapshot for the global pop + settings panel (T-034).
 * No LLM, no profile scoping (jobs aren't profile-owned; the pop mounts
 * everywhere including onboarding). Calling recoverStaleJobs() here is what
 * marks orphan queued jobs `pending_approval` on the first poll after boot —
 * it's idempotent (staleCheckDone) so repeated polls are cheap.
 */
export async function GET(req: Request) {
  recoverStaleJobs();
  const url = new URL(req.url);
  const raw = Number(url.searchParams.get("history"));
  const historyLimit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 100) : undefined;
  return NextResponse.json(listJobs(historyLimit));
}
