import { NextResponse } from "next/server";
import { and, asc, eq, lte, count } from "drizzle-orm";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";

export const runtime = "nodejs";

export async function GET() {
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }
  const now = new Date();
  const where = and(
    eq(tables.srsCards.profileId, profile.id),
    lte(tables.srsCards.dueAt, now)
  );
  const cards = db.query.srsCards
    .findMany({ where, orderBy: [asc(tables.srsCards.dueAt)], limit: 20 })
    .sync()
    .map((c) => ({
      id: c.id,
      itemType: c.itemType,
      front: c.front,
      back: c.back,
      reading: c.reading,
      example: c.example,
    }));
  const total = db
    .select({ n: count() })
    .from(tables.srsCards)
    .where(where)
    .get();
  return NextResponse.json({ cards, dueCount: total?.n ?? 0 });
}
