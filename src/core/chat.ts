import { asc, eq } from "drizzle-orm";
import * as tables from "@/db/schema";
import type { AppDb } from "./db-types";

/** Son sohbet oturumunun geçmişi (chat sayfası restore). Salt okuma. */
export function chatHistory(db: AppDb, profileId: string) {
  const session = db
    .select()
    .from(tables.chatSessions)
    .where(eq(tables.chatSessions.profileId, profileId))
    .orderBy(asc(tables.chatSessions.createdAt))
    .limit(1)
    .get();
  if (!session)
    return { sessionId: null as string | null, messages: [] as { role: string; content: string }[] };
  const messages = db
    .select()
    .from(tables.chatMessages)
    .where(eq(tables.chatMessages.sessionId, session.id))
    .orderBy(asc(tables.chatMessages.createdAt))
    .all()
    .map((m) => ({ role: m.role, content: m.content }));
  return { sessionId: session.id as string | null, messages };
}
