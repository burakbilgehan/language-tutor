import { requireAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { getStats } from "@/core/stats";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;

  return NextResponse.json(getStats(db));
}
