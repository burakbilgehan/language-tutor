import { and, eq } from "drizzle-orm";
import * as tables from "@/db/schema";
import { stripFurigana } from "@/lib/jp";
import type { AppDb } from "./db-types";

export function normalizeTranslateText(text: string): string {
  return stripFurigana(text).replace(/\s+/g, " ").trim();
}

/** Çeviri cache okuma — (targetLanguage, nativeLanguage, sourceText)
 * anahtarıyla. LLM yok. */
export function cachedTranslation(
  db: AppDb,
  targetLanguage: string,
  normalizedText: string,
  nativeLanguage: string = "tr"
): string | null {
  const cached = db
    .select()
    .from(tables.translations)
    .where(
      and(
        eq(tables.translations.targetLanguage, targetLanguage),
        eq(tables.translations.nativeLanguage, nativeLanguage),
        eq(tables.translations.sourceText, normalizedText)
      )
    )
    .limit(1)
    .get();
  return cached?.translationTr ?? null;
}
