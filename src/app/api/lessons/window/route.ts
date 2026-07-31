import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getActiveProfile } from "@/lib/profile";
import { primeLessonWindowForProfile } from "@/lib/jobs";
import type { NativeLang } from "@/lib/llm/lang-content";

export const runtime = "nodejs";

/**
 * T-068 third trigger: fill the lesson window from the frontier once per
 * app/map open. Thin shell over `primeLessonWindowForProfile` (which is
 * itself a shell over the pure `lessonWindowTargets` in src/core).
 *
 * No-op when the window is already full ("don't regenerate on revisit"), and
 * a no-op without an LLM (the enqueue path gates on llmConfigured()).
 */
export async function POST(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "profile_missing" }, { status: 404 });
  }
  const queued = primeLessonWindowForProfile(
    profile.id,
    (profile.nativeLanguage ?? "tr") as NativeLang
  );
  return NextResponse.json({ queued });
}
