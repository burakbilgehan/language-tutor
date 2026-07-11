import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db, tables } from "@/db";

export const runtime = "nodejs";

export async function GET() {
  const profile = db.query.profiles.findFirst().sync();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }
  const topics = db.query.grammarTopics
    .findMany({
      where: eq(tables.grammarTopics.targetLanguage, profile.targetLanguage),
      orderBy: [asc(tables.grammarTopics.position)],
    })
    .sync()
    .map((t) => ({
      slug: t.slug,
      titleTr: t.titleTr,
      category: t.category,
      status: t.status,
    }));
  return NextResponse.json({ topics });
}
