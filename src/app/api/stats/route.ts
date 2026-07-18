import { NextResponse } from "next/server";
import { db } from "@/db";
import { getStats } from "@/core/stats";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getStats(db));
}
