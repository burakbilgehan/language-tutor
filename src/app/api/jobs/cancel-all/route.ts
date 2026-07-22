import { NextResponse } from "next/server";
import { cancelAllJobs } from "@/lib/jobs";

export const runtime = "nodejs";

/**
 * Bulk cancel. Defaults to user batches only (grammar/vocab/kanji) so lesson
 * prefetch / chapter auto-extend aren't killed by accident. Pass
 * { includeSystem: true } to cancel everything.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const userOnly = body?.includeSystem === true ? false : true;
  const result = cancelAllJobs({ userOnly });
  return NextResponse.json({
    cancelled: result.deleted.length + result.cancelling.length,
    ...result,
  });
}
