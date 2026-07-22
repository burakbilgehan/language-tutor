import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { createJob, runJob, recoverStaleJobs } from "@/lib/jobs";
import { requireLlm } from "@/lib/llm/require-llm";
import { readLangContent, type NativeLang } from "@/lib/llm/lang-content";
import type { GrammarTopicContent } from "@/lib/llm/schemas";

export const runtime = "nodejs";

/** Enqueue generation for every topic not yet ready IN THE CURRENT NATIVE
 * LANGUAGE (pending/errored, or ready only in another language — T-031). */
export async function POST(req: Request) {
  const gate = requireLlm();
  if (gate) return gate;
  recoverStaleJobs();
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
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
    // Not ready in the current native language → needs generation.
    .filter(
      (t) =>
        t.status !== "ready" ||
        !readLangContent<GrammarTopicContent>(t.content, nativeLang)
    );

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
