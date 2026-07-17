import { and, asc, count, eq, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as tables from "@/db/schema";
import { review, type Rating } from "@/lib/srs";
import { awardXp } from "./xp";
import { getActiveProfile } from "./profile";
import type { AppDb } from "./db-types";

// SRS akışının ortam-bağımsız çekirdeği. API route'ları (sunucu db ile) ve
// statik build'deki client-api (tarayıcı db ile) aynı fonksiyonları çağırır —
// davranış tek kaynaktan.

export interface DueCard {
  id: string;
  itemType: string;
  front: string;
  back: string;
  reading: string | null;
  example: string | null;
}

export function srsDue(db: AppDb): {
  cards: DueCard[];
  dueCount: number;
} | null {
  const profile = getActiveProfile(db);
  if (!profile) return null;
  const now = new Date();
  const where = and(
    eq(tables.srsCards.profileId, profile.id),
    lte(tables.srsCards.dueAt, now)
  );
  const cards = db
    .select()
    .from(tables.srsCards)
    .where(where)
    .orderBy(asc(tables.srsCards.dueAt))
    .limit(20)
    .all()
    .map((c) => ({
      id: c.id,
      itemType: c.itemType,
      front: c.front,
      back: c.back,
      reading: c.reading,
      example: c.example,
    }));
  const total = db.select({ n: count() }).from(tables.srsCards).where(where).get();
  return { cards, dueCount: total?.n ?? 0 };
}

export function srsReview(
  db: AppDb,
  cardId: string,
  rating: Rating
): { nextDueAt: Date; intervalDays: number; remaining: number } | null {
  const card = db
    .select()
    .from(tables.srsCards)
    .where(eq(tables.srsCards.id, cardId))
    .limit(1)
    .get();
  if (!card) return null;

  const next = review(
    {
      easeFactor: card.easeFactor,
      intervalDays: card.intervalDays,
      repetitions: card.repetitions,
      lapses: card.lapses,
    },
    rating
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

  if (rating >= 2) awardXp(db, card.profileId, 2, "srs_review", cardId);

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

  return {
    nextDueAt: next.dueAt,
    intervalDays: next.intervalDays,
    remaining: remaining?.n ?? 0,
  };
}
