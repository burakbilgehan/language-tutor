import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { createJob, runJob, recoverStaleJobs } from "@/lib/jobs";
import { requireLlm } from "@/lib/llm/require-llm";
import { readLangContent, type NativeLang } from "@/lib/llm/lang-content";
import { isMachineTranslated, type GrammarTopicContent } from "@/lib/llm/schemas";

export const runtime = "nodejs";

/** Enqueue generation for every topic not yet ready IN THE CURRENT NATIVE
 * LANGUAGE (pending/errored, ready only in another language — T-031 — or
 * ready but machine-translated, which "Prepare All" should upgrade to a real
 * LLM generation — T-064). */
export async function POST(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const gate = requireLlm();
  if (gate) return gate;
  recoverStaleJobs();
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "profile_missing" }, { status: 404 });
  }
  const { level } = await req.json().catch(() => ({ level: undefined }));
  const nativeLang = (profile.nativeLanguage ?? "tr") as NativeLang;

  const topics = db
    .select()
    .from(tables.grammarTopics)
    .where(
      and(
        eq(tables.grammarTopics.targetLanguage, profile.targetLanguage),
        ...(level ? [eq(tables.grammarTopics.level, level)] : [])
      )
    )
    .all()
    // Not ready in the current native language, or ready but MT-only →
    // needs generation.
    .filter((t) => {
      if (t.status !== "ready") return true;
      const localized = readLangContent<GrammarTopicContent>(
        t.content,
        nativeLang
      );
      return !localized || isMachineTranslated(localized);
    });

  // Drive sequentially (like queueKanjiLevel): firing every job at once
  // marks them all 'running' while they wait behind the CLI queue, and any
  // process restart then turns the whole batch into stale-sweep casualties.
  const jobIds = topics.map((t) => createJob("grammar", t.id));
  void (async () => {
    for (const id of jobIds) {
      await runJob(id); // no-op for deduped ids already run elsewhere
    }
  })();

  return NextResponse.json({ count: topics.length });
}
