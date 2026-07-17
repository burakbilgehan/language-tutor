import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { createJob, runJob, recoverStaleJobs } from "@/lib/jobs";

export const runtime = "nodejs";

function findTopic(slug: string) {
  const profile = getActiveProfile();
  if (!profile) return null;
  return (
    db.query.grammarTopics
      .findFirst({
        where: and(
          eq(tables.grammarTopics.targetLanguage, profile.targetLanguage),
          eq(tables.grammarTopics.slug, slug)
        ),
      })
      .sync() ?? null
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const topic = findTopic(slug);
  if (!topic) {
    return NextResponse.json({ error: "Konu bulunamadı" }, { status: 404 });
  }
  return NextResponse.json({
    slug: topic.slug,
    titleTr: topic.titleTr,
    category: topic.category,
    status: topic.status,
    content: topic.status === "ready" ? topic.content : null,
  });
}

/** Trigger generation for a pending/errored topic. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  recoverStaleJobs();
  const { slug } = await params;
  const topic = findTopic(slug);
  if (!topic) {
    return NextResponse.json({ error: "Konu bulunamadı" }, { status: 404 });
  }
  if (topic.status === "ready") {
    return NextResponse.json({ status: "ready" });
  }
  const inflight = db.query.generationJobs
    .findFirst({
      where: and(
        eq(tables.generationJobs.jobType, "grammar"),
        eq(tables.generationJobs.refId, topic.id),
        inArray(tables.generationJobs.status, ["queued", "running"])
      ),
    })
    .sync();
  if (inflight) {
    return NextResponse.json({ status: "generating", jobId: inflight.id });
  }
  const jobId = createJob("grammar", topic.id);
  void runJob(jobId);
  return NextResponse.json({ status: "generating", jobId });
}
