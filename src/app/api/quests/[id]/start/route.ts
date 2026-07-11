import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { getProvider } from "@/lib/llm/provider";
import { SideQuestPayloadSchema } from "@/lib/llm/schemas";
import { sideQuestPrompt } from "@/lib/llm/prompts/side-quest";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const node = db.query.nodes
    .findFirst({ where: eq(tables.nodes.id, id) })
    .sync();
  if (!node || node.nodeType !== "side_quest") {
    return NextResponse.json({ error: "Yan görev bulunamadı" }, { status: 404 });
  }
  const profile = db.query.profiles.findFirst().sync();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }

  const recentVocab = db.query.srsCards
    .findMany({
      where: eq(tables.srsCards.profileId, profile.id),
      orderBy: [desc(tables.srsCards.createdAt)],
      limit: 30,
    })
    .sync()
    .map((c) => ({ term: c.front, meaning: c.back }));

  const completedTitles = db
    .select({ title: tables.nodes.titleTr })
    .from(tables.nodes)
    .where(eq(tables.nodes.status, "completed"))
    .all()
    .map((r) => r.title)
    .slice(-12);

  const { system, prompt } = sideQuestPrompt({
    targetLanguage: profile.targetLanguage,
    node,
    selfLevel: profile.selfLevel,
    recentVocab,
    completedTitles,
  });

  // Fresh content every run — that's the point of a drill. Fast tier, sync.
  const payload = await getProvider().generateJson({
    system,
    prompt,
    schema: SideQuestPayloadSchema,
    fixtureKey: "side_quest",
    tier: "fast",
    timeoutMs: 120_000,
  });

  return NextResponse.json({
    node: { id: node.id, titleTr: node.titleTr, xpReward: node.xpReward },
    quest: payload,
  });
}
