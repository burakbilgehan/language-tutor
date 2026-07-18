import { NextResponse } from "next/server";
import { db } from "@/db";
import { openNode } from "@/core/lesson";
import {
  ensureLessonJob,
  prefetchSuccessorLessons,
  recoverStaleJobs,
} from "@/lib/jobs";
import { llmConfigured } from "@/lib/llm/config";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  recoverStaleJobs();
  const { id: nodeId } = await params;

  const result = openNode(db, nodeId);
  if (result.status === "notFound") {
    return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 });
  }
  if (result.status === "locked") {
    return NextResponse.json({ error: "Bu ders henüz kilitli" }, { status: 403 });
  }
  if (result.status === "ready") {
    // The learner is about to spend minutes here — generate the next lesson
    // in the background now, not at completion time.
    prefetchSuccessorLessons(nodeId);
    return NextResponse.json(result);
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
  const jobId = ensureLessonJob(nodeId);
  return NextResponse.json({ status: "generating", jobId });
}
