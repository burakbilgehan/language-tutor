import { NextResponse } from "next/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, tables } from "@/db";
import { createJob, runJob, recoverStaleJobs } from "@/lib/jobs";

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

  // Not ready → make sure a generation job is running and tell client to poll.
  const inflight = db.query.generationJobs
    .findFirst({
      where: and(
        eq(tables.generationJobs.jobType, "lesson"),
        eq(tables.generationJobs.refId, nodeId),
        inArray(tables.generationJobs.status, ["queued", "running"])
      ),
    })
    .sync();
  if (inflight) {
    return NextResponse.json({ status: "generating", jobId: inflight.id });
  }

  const jobId = createJob("lesson", nodeId);
  void runJob(jobId);
  return NextResponse.json({ status: "generating", jobId });
}
