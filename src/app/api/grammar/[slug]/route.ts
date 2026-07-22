import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { findGrammarTopic } from "@/core/grammar";
import { createJob, runJob, recoverStaleJobs } from "@/lib/jobs";
import { requireLlm } from "@/lib/llm/require-llm";
import { readLangContent, type NativeLang } from "@/lib/llm/lang-content";
import type { GrammarTopicContent } from "@/lib/llm/schemas";

export const runtime = "nodejs";

function findTopic(slug: string) {
  const profile = getActiveProfile();
  if (!profile) return null;
  const topic = findGrammarTopic(db, profile.targetLanguage, slug);
  if (!topic) return null;
  const nativeLang = (profile.nativeLanguage ?? "tr") as NativeLang;
  const localized =
    topic.status === "ready"
      ? readLangContent<GrammarTopicContent>(topic.content, nativeLang)
      : null;
  return { topic, localized };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const found = findTopic(slug);
  if (!found) {
    return NextResponse.json({ error: "Konu bulunamadı" }, { status: 404 });
  }
  const { topic, localized } = found;
  return NextResponse.json({
    slug: topic.slug,
    titleTr: topic.titleTr,
    category: topic.category,
    status: localized ? "ready" : "pending",
    content: localized,
  });
}

/** Trigger generation for a pending/errored topic. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  recoverStaleJobs();
  const { slug } = await params;
  const found = findTopic(slug);
  if (!found) {
    return NextResponse.json({ error: "Konu bulunamadı" }, { status: 404 });
  }
  const { topic, localized } = found;
  if (localized) {
    return NextResponse.json({ status: "ready" });
  }
  const gate = requireLlm();
  if (gate) return gate;
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
