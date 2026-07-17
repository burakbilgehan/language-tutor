import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { completeNode, isCurriculumTail } from "@/lib/roadmap";
import { awardXp } from "@/lib/xp";
import {
  createJob,
  ensureLessonJob,
  runJob,
  topChapterLevel,
} from "@/lib/jobs";
import { nextLevelFor } from "@/lib/curriculum/levels";

export const runtime = "nodejs";

/**
 * If the just-completed node is the curriculum tail and a next level exists
 * in the profile's scheme (JLPT/HSK/CEFR), enqueue that chapter
 * (fire-and-forget) so progression never dead-ends. No-op at the top level,
 * or if a chapter job is already queued/running.
 * Returns the level being generated, if any.
 */
function maybeAutoExtend(
  profileId: string,
  targetLanguage: string,
  nodeId: string
): string | null {
  if (!isCurriculumTail(nodeId)) return null;
  const curriculum = db.query.curricula
    .findFirst({ where: eq(tables.curricula.profileId, profileId) })
    .sync();
  if (!curriculum) return null;
  const top = topChapterLevel(curriculum.id, targetLanguage);
  const next = top ? nextLevelFor(targetLanguage, top) : null;
  if (!next) return null;

  // createJob dedupes on (jobType, refId) — safe to call unconditionally.
  const jobId = createJob("chapter", `${profileId}:${next}`);
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
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }

  const alreadyCompleted = node.status === "completed";
  const unlockedNodeIds = alreadyCompleted ? [] : completeNode(nodeId);

  // Prefetch: generate the just-unlocked lesson(s) in the background so the
  // learner never stares at a 90s spinner — by the time they open the next
  // node, it's ready (open route serves cached lessons instantly).
  for (const unlockedId of unlockedNodeIds) {
    ensureLessonJob(unlockedId);
  }

  // Side quests: clear the cached drill payload on completion so the NEXT run
  // gets fresh content (re-opens without completing stay free).
  if (node.nodeType === "side_quest") {
    db.update(tables.nodes)
      .set({ sideQuestPayload: null })
      .where(eq(tables.nodes.id, nodeId))
      .run();
  }

  // Auto-extend to the next level when the learner clears the tail.
  const extendingLevel =
    !alreadyCompleted && node.nodeType === "main"
      ? maybeAutoExtend(profile.id, profile.targetLanguage, nodeId)
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
