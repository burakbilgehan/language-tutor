import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { srsDue } from "@/core/srs";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;

  const result = srsDue(db);
  if (!result) {
    return NextResponse.json({ error: "profile_missing" }, { status: 404 });
  }
  return NextResponse.json(result);
}
