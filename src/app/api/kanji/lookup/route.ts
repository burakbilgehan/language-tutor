import { NextResponse } from "next/server";
import { db } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { kanjiLookup } from "@/core/kanji";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "profile_missing" }, { status: 404 });
  }
  const text = new URL(req.url).searchParams.get("text") ?? "";
  return NextResponse.json(kanjiLookup(db, profile.targetLanguage, text));
}
