import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import {
  createJob,
  runJob,
  recoverStaleJobs,
  topChapterLevel,
  ensureChaptersBackfilled,
} from "@/lib/jobs";
import { nextLevelFor } from "@/lib/curriculum/levels";
import { requireLlm } from "@/lib/llm/require-llm";

export const runtime = "nodejs";

/**
 * Manually prepare the next chapter of the profile's level scheme. Only the
 * immediate next level is
 * enqueued; the auto-trigger on the complete route chains forward from there,
 * so we never fire several 2-5 min opus jobs at once.
 */
export async function POST(req: Request) {
  const gate = requireLlm();
  if (gate) return gate;
  recoverStaleJobs();
  const parsed = z
    .object({ profileId: z.string() })
    .safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "profileId gerekli" }, { status: 400 });
  }
  const { profileId } = parsed.data;

  ensureChaptersBackfilled();

  const curriculum = db.query.curricula
    .findFirst({ where: eq(tables.curricula.profileId, profileId) })
    .sync();
  if (!curriculum) {
    return NextResponse.json({ error: "Müfredat yok" }, { status: 404 });
  }
  const profile = db.query.profiles
    .findFirst({ where: eq(tables.profiles.id, profileId) })
    .sync();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }

  const top = topChapterLevel(curriculum.id, profile.targetLanguage);
  const next = top ? nextLevelFor(profile.targetLanguage, top) : null;
  if (!next) {
    return NextResponse.json(
      { error: "En üst seviyeye ulaşıldı", done: true },
      { status: 409 }
    );
  }

  // createJob dedupes on (jobType, refId): an in-flight job's id is returned.
  const jobId = createJob("chapter", `${profileId}:${next}`);
  void runJob(jobId);
  return NextResponse.json({ jobId, level: next });
}
