import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { db, tables } from "@/db";

export const runtime = "nodejs";

const ProfileInput = z.object({
  targetLanguage: z.enum(["ja", "nl"]),
  displayName: z.string().min(1).max(60),
  goals: z.array(z.string()).min(1),
  selfLevel: z.enum(["zero", "beginner", "elementary", "intermediate"]),
  minutesPerWeek: z.number().int().min(15).max(2000),
  interests: z.array(z.string()).min(1),
  motivation: z.string().max(2000),
});

export async function GET() {
  const profile = db.query.profiles.findFirst().sync();
  return NextResponse.json({ profile: profile ?? null });
}

export async function POST(req: Request) {
  const parsed = ProfileInput.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const id = nanoid();
  db.insert(tables.profiles)
    .values({ id, ...parsed.data })
    .run();
  db.insert(tables.streaks)
    .values({ profileId: id })
    .onConflictDoNothing()
    .run();
  const profile = db.query.profiles.findFirst().sync();
  return NextResponse.json({ profile });
}
