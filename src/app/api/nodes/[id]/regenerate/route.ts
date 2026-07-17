import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { recoverStaleJobs, regenerateLessonJob } from "@/lib/jobs";
import { requireLlm } from "@/lib/llm/require-llm";

export const runtime = "nodejs";

/**
 * Rebuild a node's lesson from scratch under the current prompt — used when a
 * cached lesson's exercises predate prompt improvements. Replaces the lesson
 * content, its exercises and their attempts; node status is untouched.
 */
export async function POST(
  _req: Request,
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
    return NextResponse.json({ error: "Ders bulunamadı" }, { status: 404 });
  }
  if (node.status === "locked") {
    return NextResponse.json({ error: "Bu ders henüz kilitli" }, { status: 403 });
  }

  const jobId = regenerateLessonJob(nodeId);
  return NextResponse.json({ status: "generating", jobId });
}
