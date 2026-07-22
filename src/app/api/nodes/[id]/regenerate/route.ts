import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { recoverStaleJobs, regenerateLessonJob } from "@/lib/jobs";
import { requireLlm } from "@/lib/llm/require-llm";

export const runtime = "nodejs";

const BodySchema = z.object({ feedback: z.string().nullish() });

/**
 * Rebuild a node's lesson from scratch under the current prompt — used when a
 * cached lesson's exercises predate prompt improvements. Replaces the lesson
 * content, its exercises and their attempts; node status is untouched.
 * Optional JSON body `{ feedback }`: what was wrong with the previous
 * generation, threaded into the regenerate prompt (empty/missing = old
 * blind-regenerate behavior).
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = requireLlm();
  if (gate) return gate;
  recoverStaleJobs();
  const { id: nodeId } = await params;

  const node = db.query.nodes
    .findFirst({ where: eq(tables.nodes.id, nodeId) })
    .sync();
  if (!node) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (node.status === "locked") {
    return NextResponse.json({ error: "node_locked" }, { status: 403 });
  }

  const rawBody = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(rawBody);
  const feedback = parsed.success ? parsed.data.feedback : null;

  const jobId = regenerateLessonJob(nodeId, feedback);
  return NextResponse.json({ status: "generating", jobId });
}
