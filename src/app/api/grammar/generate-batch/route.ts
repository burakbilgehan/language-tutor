import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { createJob, runJob, recoverStaleJobs } from "@/lib/jobs";
import { requireLlm } from "@/lib/llm/require-llm";

export const runtime = "nodejs";

/** Enqueue generation for every pending/errored topic (optionally scoped to one level). */
export async function POST(req: Request) {
  const gate = requireLlm();
  if (gate) return gate;
  recoverStaleJobs();
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }
  const { level } = await req.json().catch(() => ({ level: undefined }));

  const topics = db.query.grammarTopics
    .findMany({
      where: and(
        eq(tables.grammarTopics.targetLanguage, profile.targetLanguage),
        inArray(tables.grammarTopics.status, ["pending", "error"]),
        ...(level ? [eq(tables.grammarTopics.level, level)] : [])
      ),
    })
    .sync();

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
