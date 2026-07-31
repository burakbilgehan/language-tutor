import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { isCurriculumTail } from "@/lib/roadmap";
import { completeNodeFlow } from "@/core/lesson";
import { createJob, prefetchLessonWindow, runJob, topChapterLevel } from "@/lib/jobs";
import { nextLevelFor } from "@/lib/curriculum/levels";
import { llmConfigured } from "@/lib/llm/config";
import type { NativeLang } from "@/lib/llm/lang-content";

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
  if (!llmConfigured()) return null; // no LLM → don't enqueue a doomed chapter job
  if (!isCurriculumTail(nodeId)) return null;
  const curriculum = db
    .select()
    .from(tables.curricula)
    .where(eq(tables.curricula.profileId, profileId))
    .limit(1)
    .get();
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
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const { id: nodeId } = await params;
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "profile_missing" }, { status: 404 });
  }
  const node = db
    .select()
    .from(tables.nodes)
    .where(eq(tables.nodes.id, nodeId))
    .limit(1)
    .get();
  if (!node) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const wasCompleted = node.status === "completed";

  const flow = completeNodeFlow(db, nodeId, profile.id);
  if (!flow) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // T-068 second trigger: the new active lesson is the just-unlocked
  // successor, so fill the window (n..n+2) from there rather than generating
  // only the direct successor. Already-ready nodes cost nothing.
  for (const unlockedId of flow.unlockedNodeIds) {
    prefetchLessonWindow(
      unlockedId,
      2,
      (profile.nativeLanguage ?? "tr") as NativeLang
    );
  }

  // Auto-extend to the next level when the learner clears the tail.
  const extendingLevel =
    !wasCompleted && node.nodeType === "main"
      ? maybeAutoExtend(profile.id, profile.targetLanguage, nodeId)
      : null;

  return NextResponse.json({ ...flow, extendingLevel });
}
