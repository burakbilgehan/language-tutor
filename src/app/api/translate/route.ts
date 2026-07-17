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

  // Cache note: translations are keyed on (targetLanguage, sourceText) only;
  // a profile's nativeLanguage effectively never changes, so stale-language
  // cache entries aren't worth a schema change.
  const lang = languageName(profile.targetLanguage);
  const native = nativeLanguageName(profile.nativeLanguage);
  const translation = (
    await getProvider().generateText({
      prompt: `Aşağıdaki ${lang} metni ${native} diline çevir. SADECE çeviriyi yaz, açıklama ekleme. Metin bir kelime listesiyse ("・" ile ayrılmış) her öğeyi aynı sırayla "・" ile ayırarak çevir.\n\n${text}`,
      fixtureKey: "translate",
      tier: "fast",
      timeoutMs: 30_000,
      urgent: true,
    })
  ).trim();
  if (!translation) {
    return NextResponse.json({ error: "Çeviri alınamadı" }, { status: 502 });
  }

  db.insert(tables.translations)
    .values({
      id: nanoid(),
      targetLanguage: profile.targetLanguage,
      sourceText: text,
      translationTr: translation,
    })
    .onConflictDoNothing()
    .run();

  return NextResponse.json({ translation });
}
