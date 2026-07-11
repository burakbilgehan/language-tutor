import { NextResponse } from "next/server";
import { z } from "zod";
import { and, count, eq, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, tables } from "@/db";
import { review, type Rating } from "@/lib/srs";
import { awardXp } from "@/lib/xp";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const parsed = z
    .object({ cardId: z.string(), rating: z.number().int().min(0).max(3) })
    .safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "cardId + rating gerekli" }, { status: 400 });
  }
  const { cardId, rating } = parsed.data;

  const card = db.query.srsCards
    .findFirst({ where: eq(tables.srsCards.id, cardId) })
    .sync();
  if (!card) {
    return NextResponse.json({ error: "Kart bulunamadı" }, { status: 404 });
  }

  const next = review(
    {
      easeFactor: card.easeFactor,
      intervalDays: card.intervalDays,
      repetitions: card.repetitions,
      lapses: card.lapses,
    },
    rating as Rating
  );

  db.transaction((tx) => {
    tx.update(tables.srsCards)
      .set({
        easeFactor: next.easeFactor,
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        lapses: next.lapses,
        dueAt: next.dueAt,
      })
      .where(eq(tables.srsCards.id, cardId))
      .run();
    tx.insert(tables.srsReviews)
      .values({
        id: nanoid(),
        cardId,
        rating,
        intervalBefore: card.intervalDays,
        intervalAfter: next.intervalDays,
      })
      .run();
  });

  if (rating >= 2) awardXp(card.profileId, 2, "srs_review", cardId);

  const remaining = db
    .select({ n: count() })
    .from(tables.srsCards)
    .where(
      and(
        eq(tables.srsCards.profileId, card.profileId),
        lte(tables.srsCards.dueAt, new Date())
      )
    )
    .get();

  return NextResponse.json({
    nextDueAt: next.dueAt,
    intervalDays: next.intervalDays,
    remaining: remaining?.n ?? 0,
  });
}
