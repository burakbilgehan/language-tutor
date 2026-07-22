import { NextResponse } from "next/server";
import { z } from "zod";
import { setActiveProfile } from "@/lib/profile";

export const runtime = "nodejs";

const SwitchInput = z.object({ profileId: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = SwitchInput.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const profile = setActiveProfile(parsed.data.profileId);
  if (!profile) {
    return NextResponse.json({ error: "profile_missing" }, { status: 404 });
  }
  return NextResponse.json({ profile });
}
