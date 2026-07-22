import { NextResponse } from "next/server";
import { db } from "@/db";
import { srsDue } from "@/core/srs";

export const runtime = "nodejs";

export async function GET() {
  const result = srsDue(db);
  if (!result) {
    return NextResponse.json({ error: "profile_missing" }, { status: 404 });
  }
  return NextResponse.json(result);
}
