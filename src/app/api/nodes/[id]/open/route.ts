import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { openNode } from "@/core/lesson";
import { getActiveProfile } from "@/lib/profile";
import type { NativeLang } from "@/lib/llm/lang-content";
import {
  ensureLessonJob,
  prefetchLessonWindow,
  recoverStaleJobs,
} from "@/lib/jobs";
import { llmConfigured } from "@/lib/llm/config";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAuth(req);
  if (denied) return denied;

  recoverStaleJobs();
  const { id: nodeId } = await params;

  const profile = getActiveProfile();
  const result = openNode(
    db,
    nodeId,
    (profile?.nativeLanguage ?? "tr") as NativeLang
  );
  if (result.status === "notFound") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (result.status === "locked") {
    return NextResponse.json({ error: "node_locked" }, { status: 403 });
  }
  const nativeLang = (profile?.nativeLanguage ?? "tr") as NativeLang;
  if (result.status === "ready") {
    // The learner is about to spend minutes here, so fill the lesson window
    // (n..n+2) in the background now, not at completion time. T-068 pulled
    // the old depth-3 successor sweep onto the k=2 window invariant, which is
    // also what the static branch runs.
    prefetchLessonWindow(nodeId, 2, nativeLang);
    return NextResponse.json(result);
  }

  // T-070-B: the last generation attempt failed. Returning "generating" here
  // (which is what needsGeneration did before the split) left the client
  // polling forever while every open silently enqueued another doomed job.
  // Report it explicitly; retry is the user's action (POST .../regenerate).
  if (result.status === "error") {
    // The node itself is broken but its successors may still be fillable.
    prefetchLessonWindow(nodeId, 2, nativeLang);
    return NextResponse.json({ status: "error" });
  }

  // needsGeneration → without an LLM the job can't run; return an explicit
  // state instead of an eternal "generating" poll.
  if (!llmConfigured()) {
    return NextResponse.json(
      {
        error: "llm_unconfigured",
        message:
          "Bu ders henüz üretilmemiş ve LLM sağlayıcısı yapılandırılmamış. Ayarlar → LLM Sağlayıcı bölümüne bak.",
      },
      { status: 503 }
    );
  }
  const jobId = ensureLessonJob(nodeId, nativeLang);
  return NextResponse.json({ status: "generating", jobId });
}
