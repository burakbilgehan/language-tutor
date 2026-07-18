import { and, asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as tables from "@/db/schema";
import { vocabIndexFor } from "@/lib/vocab-index";
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

export function listVocab(db: AppDb, targetLanguage: string) {
  ensureVocabSeeded(db, targetLanguage);
  return db
    .select({
      word: tables.vocabEntries.word,
      reading: tables.vocabEntries.reading,
      meaningsEn: tables.vocabEntries.meaningsEn,
      level: tables.vocabEntries.level,
      status: tables.vocabEntries.status,
    })
    .from(tables.vocabEntries)
    .where(eq(tables.vocabEntries.targetLanguage, targetLanguage))
    .orderBy(asc(tables.vocabEntries.position))
    .all();
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
