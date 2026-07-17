import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { createJob, runJob, recoverStaleJobs } from "@/lib/jobs";

export const runtime = "nodejs";

/** Enqueue generation for every pending/errored topic (optionally scoped to one level). */
export async function POST(req: Request) {
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

  for (const topic of topics) {
    const jobId = createJob("grammar", topic.id);
    void runJob(jobId);
  }

  return NextResponse.json({ count: topics.length });
}
