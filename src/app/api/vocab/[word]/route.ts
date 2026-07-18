import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { ensureVocabSeeded, findVocab } from "@/core/vocab";
import { createJob, runJob, recoverStaleJobs } from "@/lib/jobs";
import { requireLlm } from "@/lib/llm/require-llm";

export const runtime = "nodejs";

function findEntry(word: string) {
  const profile = getActiveProfile();
  if (!profile) return null;
  const entry = findVocab(db, profile.targetLanguage, word);
  if (entry) return entry;
  // Deep link (?word=) can arrive before the list ever seeded this profile.
  ensureVocabSeeded(db, profile.targetLanguage);
  return findVocab(db, profile.targetLanguage, word);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ word: string }> }
) {
  const { word } = await params;
  const entry = findEntry(word);
  if (!entry) {
    return NextResponse.json({ error: "Kelime bulunamadı" }, { status: 404 });
  }
  return NextResponse.json({
    word: entry.word,
    traditional: entry.traditional,
    reading: entry.reading,
    meaningsEn: entry.meaningsEn,
    classifiers: entry.classifiers,
    level: entry.level,
    status: entry.status,
    content: entry.status === "ready" ? entry.content : null,
  });
}

/** Trigger generation for a pending/errored entry. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ word: string }> }
) {
  recoverStaleJobs();
  const { word } = await params;
  const entry = findEntry(word);
  if (!entry) {
    return NextResponse.json({ error: "Kelime bulunamadı" }, { status: 404 });
  }
  if (entry.status === "ready") {
    return NextResponse.json({ status: "ready" });
  }
  const gate = requireLlm();
  if (gate) return gate;
  const inflight = db.query.generationJobs
    .findFirst({
      where: and(
        eq(tables.generationJobs.jobType, "vocab"),
        eq(tables.generationJobs.refId, entry.id),
        inArray(tables.generationJobs.status, ["queued", "running"])
      ),
    })
    .sync();
  if (inflight) {
    return NextResponse.json({ status: "generating", jobId: inflight.id });
  }
  const jobId = createJob("vocab", entry.id);
  void runJob(jobId);
  return NextResponse.json({ status: "generating", jobId });
}
