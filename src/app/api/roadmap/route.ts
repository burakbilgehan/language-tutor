import { NextResponse } from "next/server";
import { db } from "@/db";
import { getRoadmap } from "@/lib/roadmap";

export const runtime = "nodejs";

export async function GET() {
  const profile = db.query.profiles.findFirst().sync();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }
  const roadmap = getRoadmap(profile.id);
  if (!roadmap) {
    return NextResponse.json({ error: "Müfredat hazır değil" }, { status: 404 });
  }
  return NextResponse.json(roadmap);
}
