import { NextResponse } from "next/server";
import { db } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { getRoadmap } from "@/lib/roadmap";
import { recoverStaleJobs } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET() {
  recoverStaleJobs();
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "profile_missing" }, { status: 404 });
  }
  const roadmap = getRoadmap(profile.id);
  if (!roadmap) {
    return NextResponse.json({ error: "curriculum_not_ready" }, { status: 404 });
  }
  return NextResponse.json(roadmap);
}
