import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { srsReview } from "@/core/srs";
import type { Rating } from "@/lib/srs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const parsed = z
    .object({ cardId: z.string(), rating: z.number().int().min(0).max(3) })
    .safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "cardId + rating gerekli" }, { status: 400 });
  }
  const { cardId, rating } = parsed.data;

  const result = srsReview(db, cardId, rating as Rating);
  if (!result) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(result);
}
