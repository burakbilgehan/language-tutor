import { NextResponse } from "next/server";
import { z } from "zod";
import { queueMissingLessons, recoverStaleJobs } from "@/lib/jobs";
import { requireLlm } from "@/lib/llm/require-llm";

export const runtime = "nodejs";

/**
 * "Prepare every lesson": queue generation for all main nodes of a profile
 * that don't have a ready lesson yet. Explicit bulk action (pre-generation
 * ahead of the on-demand open/prefetch path), so errored lessons are retried.
 * Takes an explicit profileId (like /api/curriculum/extend) instead of the
 * active profile, so any language's lessons can be prepared without switching.
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
  const queued = queueMissingLessons(parsed.data.profileId);
  return NextResponse.json({ queued });
}
