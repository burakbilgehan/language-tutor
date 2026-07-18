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
import { sendChatMessage } from "@/core/llm-gen";

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
  const result = await sendChatMessage(db, getProvider(), profile, {
    sessionId: parsed.data.sessionId ?? null,
    message: parsed.data.message,
    contextNodeId: parsed.data.contextNodeId,
  });
  return NextResponse.json(result);
}
