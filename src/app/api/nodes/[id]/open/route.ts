import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
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

  const node = db.query.nodes
    .findFirst({ where: eq(tables.nodes.id, nodeId) })
    .sync();
  if (!node) {
    return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 });
  }
  if (node.status === "locked") {
    return NextResponse.json({ error: "Bu ders henüz kilitli" }, { status: 403 });
  }

  const lesson = db.query.lessons
    .findFirst({ where: eq(tables.lessons.nodeId, nodeId) })
    .sync();

  if (lesson?.status === "ready" && lesson.content) {
    // The learner is about to spend minutes here — generate the next lesson
    // in the background now, not at completion time.
    prefetchSuccessorLessons(nodeId);

    const exercises = db.query.exercises
      .findMany({
        where: eq(tables.exercises.lessonId, lesson.id),
        orderBy: [asc(tables.exercises.position)],
      })
      .sync()
      .map((e) => ({
        id: e.id,
        type: e.type,
        promptTr: e.promptTr,
        targetText: e.targetText,
        options: e.options,
        // answers stay server-side
      }));
    return NextResponse.json({
      status: "ready",
      node: {
        id: node.id,
        titleTr: node.titleTr,
        subtitleTr: node.subtitleTr,
        lessonType: node.lessonType,
        xpReward: node.xpReward,
        status: node.status,
      },
      lesson: {
        titleTr: lesson.content.title_tr,
        explanationTr: lesson.content.explanation_tr,
        examples: lesson.content.examples,
        grammarNotes: lesson.content.grammar_notes,
        vocab: lesson.content.vocab,
      },
      exercises,
    });
  }

  // Not ready → without an LLM the generation job can't run; return an
  // explicit state instead of an eternal "generating" poll.
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
  // Ensure a generation job is running (deduped centrally in createJob) and
  // tell the client to poll.
  const jobId = ensureLessonJob(nodeId);
  return NextResponse.json({ status: "generating", jobId });
}
