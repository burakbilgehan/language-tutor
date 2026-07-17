import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { createJob, runJob, recoverStaleJobs } from "@/lib/jobs";
import { requireLlm } from "@/lib/llm/require-llm";
import { findKanji } from "@/core/kanji";

export const runtime = "nodejs";

function findEntry(rawChar: string) {
  const profile = getActiveProfile();
  if (!profile) return null;
  // Kanji arrives percent-encoded in the path.
  return findKanji(db, profile.targetLanguage, decodeURIComponent(rawChar));
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ char: string }> }
) {
  const { char } = await params;
  const entry = findEntry(char);
  if (!entry) {
    return NextResponse.json({ error: "Kanji bulunamadı" }, { status: 404 });
  }
  return NextResponse.json({
    char: entry.char,
    level: entry.level,
    onyomi: entry.onyomi,
    kunyomi: entry.kunyomi,
    meaningsEn: entry.meaningsEn,
    status: entry.status,
    content: entry.status === "ready" ? entry.content : null,
  });
}

/** Trigger generation for a pending/errored kanji entry. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ char: string }> }
) {
  recoverStaleJobs();
  const { char } = await params;
  const entry = findEntry(char);
  if (!entry) {
    return NextResponse.json({ error: "Kanji bulunamadı" }, { status: 404 });
  }
  if (entry.status === "ready") {
    return NextResponse.json({ status: "ready" });
  }
  const gate = requireLlm();
  if (gate) return gate;
  const inflight = db.query.generationJobs
    .findFirst({
      where: and(
        eq(tables.generationJobs.jobType, "kanji"),
        eq(tables.generationJobs.refId, entry.id),
        inArray(tables.generationJobs.status, ["queued", "running"])
      ),
    })
    .sync();
  if (inflight) {
    return NextResponse.json({ status: "generating", jobId: inflight.id });
  }
  const jobId = createJob("kanji", entry.id);
  void runJob(jobId);
  return NextResponse.json({ status: "generating", jobId });
}
