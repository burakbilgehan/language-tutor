import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, tables } from "@/db";
import { completeNode } from "@/lib/roadmap";
import { awardXp } from "@/lib/xp";

export const runtime = "nodejs";

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

  return NextResponse.json({ xpAwarded, newCards, unlockedNodeIds });
}
