import { NextResponse } from "next/server";
import { getActiveProfile } from "@/lib/profile";
import { db } from "@/db";
import { getOverview } from "@/core/overview";

export const runtime = "nodejs";

export async function GET() {
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "profile_missing" }, { status: 404 });
  }
  return NextResponse.json(getOverview(db, profile));
}
