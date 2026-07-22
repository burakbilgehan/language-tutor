import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { createJob, runJob, recoverStaleJobs } from "@/lib/jobs";
import { requireLlm } from "@/lib/llm/require-llm";
import { findKanji } from "@/core/kanji";
import { readLangContent, type NativeLang } from "@/lib/llm/lang-content";
import type { KanjiContent } from "@/lib/llm/schemas";

export const runtime = "nodejs";

function findEntry(rawChar: string) {
  const profile = getActiveProfile();
  if (!profile) return null;
  // Kanji arrives percent-encoded in the path.
  const entry = findKanji(
    db,
    profile.targetLanguage,
    decodeURIComponent(rawChar)
  );
  if (!entry) return null;
  const nativeLang = (profile.nativeLanguage ?? "tr") as NativeLang;
  // Content in the wrong native language is treated as absent (T-031).
  const localized =
    entry.status === "ready"
      ? readLangContent<KanjiContent>(entry.content, nativeLang)
      : null;
  return { entry, localized };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ char: string }> }
) {
  const { char } = await params;
  const found = findEntry(char);
  if (!found) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const { entry, localized } = found;
  return NextResponse.json({
    char: entry.char,
    level: entry.level,
    onyomi: entry.onyomi,
    kunyomi: entry.kunyomi,
    meaningsEn: entry.meaningsEn,
    // Effective status: ready only when content exists in the current native
    // language; otherwise it's pending (regenerate) regardless of row status.
    status: localized ? "ready" : "pending",
    content: localized,
  });
}

/** Trigger generation for a pending/errored kanji entry. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ char: string }> }
) {
  recoverStaleJobs();
  const { char } = await params;
  const found = findEntry(char);
  if (!found) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const { entry, localized } = found;
  if (localized) {
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
