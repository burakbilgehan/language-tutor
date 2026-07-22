import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import {
  createOrReuseProfile,
  languagesWithCurriculum,
  listProfiles,
  updateActiveProfile,
} from "@/core/profile";

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
  return NextResponse.json({
    profile: profile ?? null,
    profiles: listProfiles(db),
    usedLanguages: languagesWithCurriculum(db),
  });
}

export async function POST(req: Request) {
  const parsed = ProfileInput.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { profile, duplicate } = createOrReuseProfile(db, parsed.data);
  if (duplicate) {
    return NextResponse.json(
      { error: "Bu dil için zaten bir profil var. Ayarlardan geçiş yapabilirsin." },
      { status: 409 }
    );
  }
  return NextResponse.json({ profile });
}

export async function PATCH(req: Request) {
  const parsed = ProfilePatch.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const profile = updateActiveProfile(db, parsed.data);
  if (!profile) {
    return NextResponse.json({ error: "profile_missing" }, { status: 404 });
  }
  return NextResponse.json({ profile });
}
