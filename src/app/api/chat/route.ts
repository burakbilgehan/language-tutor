import { NextResponse } from "next/server";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { getProvider } from "@/lib/llm/provider";
import { chatPrompt } from "@/lib/llm/prompts/chat";
import { requireLlm } from "@/lib/llm/require-llm";
import { chatHistory } from "@/core/chat";

export const runtime = "nodejs";

const Input = z.object({
  sessionId: z.string().nullish(),
  message: z.string().min(1).max(4000),
  contextNodeId: z.string().nullish(),
});

export async function GET() {
  // Latest session's history, so the chat page can restore it.
  const profile = getActiveProfile();
  if (!profile) return NextResponse.json({ sessionId: null, messages: [] });
  return NextResponse.json(chatHistory(db, profile.id));
}

export async function POST(req: Request) {
  const gate = requireLlm();
  if (gate) return gate;
  const parsed = Input.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "message gerekli" }, { status: 400 });
  }
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }

  let sessionId = parsed.data.sessionId ?? null;
  if (sessionId) {
    const exists = db.query.chatSessions
      .findFirst({ where: eq(tables.chatSessions.id, sessionId) })
      .sync();
    if (!exists) sessionId = null;
  }
  if (!sessionId) {
    sessionId = nanoid();
    db.insert(tables.chatSessions)
      .values({
        id: sessionId,
        profileId: profile.id,
        contextNodeId: parsed.data.contextNodeId ?? null,
      })
      .run();
  }

  const history = db.query.chatMessages
    .findMany({
      where: eq(tables.chatMessages.sessionId, sessionId),
      orderBy: [asc(tables.chatMessages.createdAt)],
    })
    .sync()
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content }));

  let lessonContext: string | null = null;
  if (parsed.data.contextNodeId) {
    const node = db.query.nodes
      .findFirst({ where: eq(tables.nodes.id, parsed.data.contextNodeId) })
      .sync();
    if (node) lessonContext = `"${node.titleTr}" — ${node.subtitleTr}`;
  }

  const { system, prompt } = chatPrompt({
    profile,
    lessonContext,
    history,
    message: parsed.data.message,
  });

  const reply = (
    await getProvider().generateText({
      system,
      prompt,
      fixtureKey: "chat",
      tier: "balanced",
      timeoutMs: 120_000,
    })
  ).trim();

  db.insert(tables.chatMessages)
    .values([
      {
        id: nanoid(),
        sessionId,
        role: "user" as const,
        content: parsed.data.message,
      },
      { id: nanoid(), sessionId, role: "assistant" as const, content: reply },
    ])
    .run();

  return NextResponse.json({ sessionId, reply });
}
