import { NextResponse } from "next/server";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, tables } from "@/db";
import { getProvider } from "@/lib/llm/provider";
import { chatPrompt } from "@/lib/llm/prompts/chat";

export const runtime = "nodejs";

const Input = z.object({
  sessionId: z.string().nullish(),
  message: z.string().min(1).max(4000),
  contextNodeId: z.string().nullish(),
});

export async function GET() {
  // Latest session's history, so the chat page can restore it.
  const profile = db.query.profiles.findFirst().sync();
  if (!profile) return NextResponse.json({ sessionId: null, messages: [] });
  const session = db.query.chatSessions
    .findFirst({
      where: eq(tables.chatSessions.profileId, profile.id),
      orderBy: [asc(tables.chatSessions.createdAt)],
    })
    .sync();
  if (!session) return NextResponse.json({ sessionId: null, messages: [] });
  const messages = db.query.chatMessages
    .findMany({
      where: eq(tables.chatMessages.sessionId, session.id),
      orderBy: [asc(tables.chatMessages.createdAt)],
    })
    .sync()
    .map((m) => ({ role: m.role, content: m.content }));
  return NextResponse.json({ sessionId: session.id, messages });
}

export async function POST(req: Request) {
  const parsed = Input.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "message gerekli" }, { status: 400 });
  }
  const profile = db.query.profiles.findFirst().sync();
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
