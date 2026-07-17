import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { getProvider } from "@/lib/llm/provider";
import { SideQuestPayloadSchema } from "@/lib/llm/schemas";
import { sideQuestPrompt } from "@/lib/llm/prompts/side-quest";
import { requireLlm } from "@/lib/llm/require-llm";
import { getQuestCached } from "@/core/quest";
import { generateQuestPayload } from "@/core/llm-gen";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Cached payload from an uncompleted run → serve for free. Completing the
  // quest clears the cache (complete route), so each finished run is fresh,
  // but refreshes/re-opens don't pay for a new LLM call.
  const cached = getQuestCached(db, id);
  if (cached.status === "notFound") {
    return NextResponse.json({ error: "Yan görev bulunamadı" }, { status: 404 });
  }
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }
  if (cached.status === "ready") {
    return NextResponse.json({ node: cached.node, quest: cached.quest });
  }
  const node = cached.node;

  // Past the cached-payload path: a fresh run needs the LLM.
  const gate = requireLlm();
  if (gate) return gate;

  const payload = await generateQuestPayload(db, getProvider(), profile, node);

  return NextResponse.json({
    node: { id: node.id, titleTr: node.titleTr, xpReward: node.xpReward },
    quest: payload,
  });
}
