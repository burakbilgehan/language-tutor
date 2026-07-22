import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { createJob, runJob, recoverStaleJobs } from "@/lib/jobs";
import { requireLlm } from "@/lib/llm/require-llm";
import { readLangContent, type NativeLang } from "@/lib/llm/lang-content";
import type { VocabContent } from "@/lib/llm/schemas";

export const runtime = "nodejs";

/** Enqueue generation for every entry not yet ready IN THE CURRENT NATIVE
 * LANGUAGE (pending/errored, or ready only in another language — T-031). */
export async function POST(req: Request) {
  const gate = requireLlm();
  if (gate) return gate;
  recoverStaleJobs();
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "profile_missing" }, { status: 404 });
  }
  const { level } = await req.json().catch(() => ({ level: undefined }));
  const nativeLang = (profile.nativeLanguage ?? "tr") as NativeLang;

  const entries = db
    .select()
    .from(tables.vocabEntries)
    .where(
      and(
        eq(tables.vocabEntries.targetLanguage, profile.targetLanguage),
        ...(level ? [eq(tables.vocabEntries.level, level)] : [])
      )
    )
    .all()
    .filter(
      (e) =>
        e.status !== "ready" ||
        !readLangContent<VocabContent>(e.content, nativeLang)
    );

  // Drive sequentially (like queueKanjiLevel): firing every job at once
  // marks them all 'running' while they wait behind the CLI queue, and any
  // process restart then turns the whole batch into stale-sweep casualties.
  const jobIds = entries.map((e) => createJob("vocab", e.id));
  void (async () => {
    for (const id of jobIds) {
      await runJob(id); // no-op for deduped ids already run elsewhere
    }
  })();

  return NextResponse.json({ count: entries.length });
}
