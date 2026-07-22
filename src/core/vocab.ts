import { and, asc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as tables from "@/db/schema";
import { vocabIndexFor } from "@/lib/vocab-index";
import type { VocabContent } from "@/lib/llm/schemas";
import {
  mergeLangContent,
  readLangContent,
  type NativeLang,
} from "@/lib/llm/lang-content";
import type { AppDb } from "./db-types";

// Kelime sözlüğünün ortam-bağımsız çekirdeği (HSK sözlük). İçerik ÜRETİMİ
// (LLM) src/core/llm-gen.ts'te; burada yalnız deterministik index senkronu
// + okuma var.

/**
 * Self-healing incremental seed, same contract as grammar/kanji: missing
 * words are inserted (status "pending"); existing rows get their static
 * dictionary fields re-synced ONLY when they actually differ. Generated
 * content/status/generatedAt are never touched.
 */
export function ensureVocabSeeded(db: AppDb, targetLanguage: string) {
  const index = vocabIndexFor(targetLanguage);
  if (index.length === 0) return;

  const existing = db
    .select({
      id: tables.vocabEntries.id,
      word: tables.vocabEntries.word,
      level: tables.vocabEntries.level,
      position: tables.vocabEntries.position,
      reading: tables.vocabEntries.reading,
      traditional: tables.vocabEntries.traditional,
      meaningsEn: tables.vocabEntries.meaningsEn,
      classifiers: tables.vocabEntries.classifiers,
    })
    .from(tables.vocabEntries)
    .where(eq(tables.vocabEntries.targetLanguage, targetLanguage))
    .all();
  const byWord = new Map(existing.map((v) => [v.word, v]));

  db.transaction((tx) => {
    index.forEach((v, i) => {
      const row = byWord.get(v.word);
      if (!row) {
        tx.insert(tables.vocabEntries)
          .values({
            id: nanoid(),
            targetLanguage,
            word: v.word,
            level: v.level,
            position: i,
            reading: v.reading,
            traditional: v.trad ?? null,
            meaningsEn: v.en,
            classifiers: v.cls ?? null,
          })
          .onConflictDoNothing()
          .run();
        return;
      }
      const dirty =
        row.level !== v.level ||
        row.position !== i ||
        row.reading !== v.reading ||
        row.traditional !== (v.trad ?? null) ||
        JSON.stringify(row.meaningsEn) !== JSON.stringify(v.en) ||
        JSON.stringify(row.classifiers) !== JSON.stringify(v.cls ?? null);
      if (dirty) {
        tx.update(tables.vocabEntries)
          .set({
            level: v.level,
            position: i,
            reading: v.reading,
            traditional: v.trad ?? null,
            meaningsEn: v.en,
            classifiers: v.cls ?? null,
          })
          .where(eq(tables.vocabEntries.id, row.id))
          .run();
      }
    });
  });
}

/**
 * Fill still-empty entries from the packaged seed (public/vocab-seed/<lang>.json,
 * exported from the owner's DB by scripts/export-vocab-seed.ts). Only rows
 * with status pending/error are touched — user-generated content always wins.
 * Returns how many entries were filled.
 */
export function applyVocabSeed(
  db: AppDb,
  targetLanguage: string,
  seed: Record<string, VocabContent>,
  nativeLanguage: NativeLang = "tr"
): number {
  // Seed content is Turkish — never apply to a non-tr profile (T-031).
  if (nativeLanguage !== "tr") return 0;
  const empty = db
    .select({
      id: tables.vocabEntries.id,
      word: tables.vocabEntries.word,
      content: tables.vocabEntries.content,
    })
    .from(tables.vocabEntries)
    .where(
      and(
        eq(tables.vocabEntries.targetLanguage, targetLanguage),
        inArray(tables.vocabEntries.status, ["pending", "error"])
      )
    )
    .all();
  let filled = 0;
  for (const row of empty) {
    const content = seed[row.word];
    if (!content) continue;
    // Merge, not replace — an error/pending row may hold the other language's
    // content from an interrupted generation (T-031).
    db.update(tables.vocabEntries)
      .set({
        content: mergeLangContent(row.content, "tr", content),
        status: "ready",
        generatedAt: new Date(),
      })
      .where(eq(tables.vocabEntries.id, row.id))
      .run();
    filled++;
  }
  return filled;
}

export function listVocab(
  db: AppDb,
  targetLanguage: string,
  nativeLanguage: NativeLang = "tr"
) {
  // No index for this language (e.g. the removed ja dictionary) → no listing,
  // even if a previous seed left rows behind in this profile's DB.
  if (vocabIndexFor(targetLanguage).length === 0) return [];
  ensureVocabSeeded(db, targetLanguage);
  return db
    .select({
      word: tables.vocabEntries.word,
      reading: tables.vocabEntries.reading,
      meaningsEn: tables.vocabEntries.meaningsEn,
      level: tables.vocabEntries.level,
      status: tables.vocabEntries.status,
      content: tables.vocabEntries.content,
    })
    .from(tables.vocabEntries)
    .where(eq(tables.vocabEntries.targetLanguage, targetLanguage))
    .orderBy(asc(tables.vocabEntries.position))
    .all()
    .map(({ content, ...rest }) => ({
      ...rest,
      // Wrong-native-language content reads as pending (T-031).
      status:
        rest.status === "ready" &&
        !readLangContent<VocabContent>(content, nativeLanguage)
          ? ("pending" as const)
          : rest.status,
    }));
}

export function findVocab(db: AppDb, targetLanguage: string, word: string) {
  return (
    db
      .select()
      .from(tables.vocabEntries)
      .where(
        and(
          eq(tables.vocabEntries.targetLanguage, targetLanguage),
          eq(tables.vocabEntries.word, word)
        )
      )
      .limit(1)
      .get() ?? null
  );
}
