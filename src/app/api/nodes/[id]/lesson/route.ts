import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { discardLesson } from "@/core/curriculum-delete";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

/**
 * T-082. Discard ONE node's cached lesson so the next open regenerates it from
 * scratch. The node's completion state, its XP and its place in the prereq
 * chain are untouched.
 *
 * Distinct from POST /api/nodes/[id]/regenerate: that one immediately spends a
 * generation (with optional feedback) and keeps the user waiting. This one only
 * throws the cache away, which is what you want for a lesson you do not intend
 * to sit through right now, and for a user with no LLM configured at all. Hence
 * no `requireLlm` gate.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const { id: nodeId } = await params;
  try {
    const result = discardLesson(db, nodeId);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: err.code },
        { status: err.code === "not_found" ? 404 : 400 }
      );
    }
    throw err;
  }
}
