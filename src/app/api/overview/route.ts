import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getActiveProfile } from "@/lib/profile";
import { db } from "@/db";
import { getOverview } from "@/core/overview";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "profile_missing" }, { status: 404 });
  }
  return NextResponse.json(getOverview(db, profile));
}
