import { NextResponse } from "next/server";
import { db } from "@/db";
import { openNode } from "@/core/lesson";
import { getActiveProfile } from "@/lib/profile";
import type { NativeLang } from "@/lib/llm/lang-content";
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
    // The learner is about to spend minutes here — generate the next lesson
    // in the background now, not at completion time.
    prefetchSuccessorLessons(nodeId, 3, nativeLang);
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
  const jobId = ensureLessonJob(nodeId, nativeLang);
  return NextResponse.json({ status: "generating", jobId });
}
