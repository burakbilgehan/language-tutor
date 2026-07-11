import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, tables } from "@/db";
import { completeNode, isCurriculumTail } from "@/lib/roadmap";
import { awardXp } from "@/lib/xp";
import { createJob, runJob, topChapterLevel } from "@/lib/jobs";
import { nextLevel } from "@/lib/curriculum/levels";

export const runtime = "nodejs";

/**
 * If the just-completed node is the curriculum tail and a next JLPT level
 * exists, enqueue that chapter (fire-and-forget) so progression never
 * dead-ends. No-op at N1, or if a chapter job is already queued/running.
 * Returns the level being generated, if any.
 */
function maybeAutoExtend(profileId: string, nodeId: string): string | null {
  if (!isCurriculumTail(nodeId)) return null;
  const curriculum = db.query.curricula
    .findFirst({ where: eq(tables.curricula.profileId, profileId) })
    .sync();
  if (!curriculum) return null;
  const top = topChapterLevel(curriculum.id);
  const next = top ? nextLevel(top) : null;
  if (!next) return null;

  const refId = `${profileId}:${next}`;
  const inFlight = db.query.generationJobs
    .findFirst({
      where: and(
        eq(tables.generationJobs.jobType, "chapter"),
        eq(tables.generationJobs.refId, refId),
        inArray(tables.generationJobs.status, ["queued", "running"])
      ),
    })
    .sync();
  if (inFlight) return next;

  const jobId = createJob("chapter", refId);
  void runJob(jobId);
  return next;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: nodeId } = await params;
  const node = db.query.nodes
    .findFirst({ where: eq(tables.nodes.id, nodeId) })
    .sync();
  if (!node) {
    return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 });
  }
  const profile = db.query.profiles.findFirst().sync();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }

  const alreadyCompleted = node.status === "completed";
  const unlockedNodeIds = alreadyCompleted ? [] : completeNode(nodeId);

  // Auto-extend to the next JLPT level when the learner clears the tail.
  const extendingLevel =
    !alreadyCompleted && node.nodeType === "main"
      ? maybeAutoExtend(profile.id, nodeId)
      : null;

  // Harvest lesson vocab into SRS cards (dedup via unique index).
  let newCards = 0;
  const lesson = db.query.lessons
    .findFirst({ where: eq(tables.lessons.nodeId, nodeId) })
    .sync();
  if (!alreadyCompleted && lesson?.content) {
    for (const v of lesson.content.vocab) {
      const inserted = db
        .insert(tables.srsCards)
        .values({
          id: nanoid(),
          profileId: profile.id,
          itemType: "vocab",
          front: v.term,
          back: v.meaning_tr,
          reading: v.reading ?? null,
          example: v.example ?? null,
          sourceLessonId: lesson.id,
          dueAt: new Date(),
        })
        .onConflictDoNothing()
        .run();
      newCards += inserted.changes;
    }
  }

  let xpAwarded = 0;
  if (!alreadyCompleted) {
    xpAwarded = node.xpReward;
    awardXp(
      profile.id,
      xpAwarded,
      node.nodeType === "side_quest" ? "side_quest" : "lesson_complete",
      nodeId
    );
  }

  return NextResponse.json({
    xpAwarded,
    newCards,
    unlockedNodeIds,
    extendingLevel,
  });
}
