import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { findGrammarTopic } from "@/core/grammar";
import { titleFor } from "@/lib/grammar-index";
import { createJob, runJob, recoverStaleJobs } from "@/lib/jobs";
import { requireLlm } from "@/lib/llm/require-llm";
import { readLangContent, type NativeLang } from "@/lib/llm/lang-content";
import { isMachineTranslated, type GrammarTopicContent } from "@/lib/llm/schemas";

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
  const displayTitle = titleFor(
    profile.targetLanguage,
    topic.slug,
    topic.titleTr,
    nativeLang
  );
  return { topic, localized, displayTitle };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const { slug } = await params;
  const found = findTopic(slug);
  if (!found) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const { topic, localized, displayTitle } = found;
  return NextResponse.json({
    slug: topic.slug,
    titleTr: displayTitle,
    category: topic.category,
    status: localized ? "ready" : "pending",
    content: localized,
  });
}

/** Trigger generation for a pending/errored topic. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const denied = requireAuth(req);
  if (denied) return denied;

  recoverStaleJobs();
  const { slug } = await params;
  const found = findTopic(slug);
  if (!found) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const { topic, localized } = found;
  // T-064: MT-filled content reads as "ready" (it's usable now) but must
  // never block a real regeneration — the ruling requires the LLM to
  // silently override MT the moment the user connects one.
  if (localized && !isMachineTranslated(localized)) {
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
