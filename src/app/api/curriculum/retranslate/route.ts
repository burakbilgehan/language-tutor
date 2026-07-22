import { NextResponse } from "next/server";
import { getActiveProfile } from "@/lib/profile";
import { db } from "@/db";
import { getProvider } from "@/lib/llm/provider";
import { requireLlm } from "@/lib/llm/require-llm";
import { retranslateCurriculum } from "@/core/curriculum-gen";

export const runtime = "nodejs";

/**
 * Re-translate the active profile's curriculum titles/descriptions into its
 * current native language, in place (T-031). One fast LLM call; structure and
 * all progress (nodes, lessons, SRS, attempts) are preserved.
 */
export async function POST() {
  const gate = requireLlm();
  if (gate) return gate;
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "profile_missing" }, { status: 404 });
  }
  const translated = await retranslateCurriculum(db, getProvider(), profile.id);
  return NextResponse.json({ translated });
}
