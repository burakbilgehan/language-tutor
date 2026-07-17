import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { getActiveProfile, setActiveProfile } from "@/lib/profile";

export const runtime = "nodejs";

const ProfileInput = z.object({
  targetLanguage: z.enum(["ja", "zh", "nl"]),
  // Native language drives LLM content language + UI catalog; uiLanguage
  // follows it unless set separately. Defaults keep old clients working.
  nativeLanguage: z.enum(["tr", "en"]).default("tr"),
  uiLanguage: z.enum(["tr", "en"]).default("tr"),
  displayName: z.string().min(1).max(60),
  goals: z.array(z.string()).min(1),
  selfLevel: z.enum(["zero", "beginner", "elementary", "intermediate"]),
  minutesPerWeek: z.number().int().min(15).max(2000),
  interests: z.array(z.string()).min(1),
  motivation: z.string().max(2000),
});

// targetLanguage is deliberately not editable: curriculum, SRS and grammar
// are language-bound. Changing language = switching to another profile.
const ProfilePatch = ProfileInput.omit({ targetLanguage: true }).partial();

export async function GET() {
  const profile = getActiveProfile();
  const profiles = db
    .select({
      id: tables.profiles.id,
      displayName: tables.profiles.displayName,
      targetLanguage: tables.profiles.targetLanguage,
      selfLevel: tables.profiles.selfLevel,
      isActive: tables.profiles.isActive,
    })
    .from(tables.profiles)
    .all();
  return NextResponse.json({ profile: profile ?? null, profiles });
}

export async function POST(req: Request) {
  const parsed = ProfileInput.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const existing = db.query.profiles
    .findFirst({
      where: eq(tables.profiles.targetLanguage, parsed.data.targetLanguage),
    })
    .sync();
  if (existing) {
    return NextResponse.json(
      { error: "Bu dil için zaten bir profil var. Ayarlardan geçiş yapabilirsin." },
      { status: 409 }
    );
  }
  const id = nanoid();
  db.insert(tables.profiles)
    .values({ id, ...parsed.data })
    .run();
  db.insert(tables.streaks)
    .values({ profileId: id })
    .onConflictDoNothing()
    .run();
  const profile = setActiveProfile(id);
  return NextResponse.json({ profile });
}

export async function PATCH(req: Request) {
  const parsed = ProfilePatch.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "Profil bulunamadı" }, { status: 404 });
  }
  db.update(tables.profiles)
    .set(parsed.data)
    .where(eq(tables.profiles.id, profile.id))
    .run();
  return NextResponse.json({ profile: { ...profile, ...parsed.data } });
}
