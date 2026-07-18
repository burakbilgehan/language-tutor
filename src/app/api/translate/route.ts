import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { getProvider } from "@/lib/llm/provider";
import { languageName, nativeLanguageName } from "@/lib/profile-options";
import { requireLlm } from "@/lib/llm/require-llm";
import { cachedTranslation, normalizeTranslateText } from "@/core/translate";
import { freshTranslation } from "@/core/llm-gen";

export const runtime = "nodejs";

const BodySchema = z.object({
  text: z.string().min(1).max(200),
  // cachedOnly: answer from the translations cache without ever calling the
  // LLM — lets the selection tooltip show known per-char meanings instantly
  // and for free (translation: null when the cache misses).
  cachedOnly: z.boolean().optional(),
});

/**
 * Translate a selected snippet to Turkish. Cached per (language, text) in the
 * translations table — the LLM (fast tier, urgent) runs once per distinct
 * selection, ever.
 */
export async function POST(req: Request) {
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek" }, { status: 400 });
  }
  const text = normalizeTranslateText(parsed.data.text);
  if (!text) {
    return NextResponse.json({ error: "Boş metin" }, { status: 400 });
  }

  const cached = cachedTranslation(db, profile.targetLanguage, text);
  if (cached) {
    return NextResponse.json({ translation: cached });
  }
  if (parsed.data.cachedOnly) {
    return NextResponse.json({ translation: null });
  }
  // Cache hits above stay free without an LLM; only a fresh translation needs one.
  const gate = requireLlm();
  if (gate) return gate;

  const translation = await freshTranslation(
    db,
    getProvider(),
    profile,
    text
  );
  if (!translation) {
    return NextResponse.json({ error: "Çeviri alınamadı" }, { status: 502 });
  }

  return NextResponse.json({ translation });
}
