import { and, asc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as tables from "@/db/schema";
import { kanjiIndexFor } from "@/lib/kanji-index";
import { lookupWord } from "@/lib/jmdict";
import type { AppDb } from "./db-types";

// Kanji/hanzi yüzeyinin ortam-bağımsız çekirdeği. İçerik ÜRETİMİ (LLM)
// sunucu job'unda / gelecekte tarayıcı LLM katmanında.

/**
 * Self-healing incremental seed, same contract as the grammar cheatsheet:
 * missing chars are inserted (status "pending"); existing rows get their
 * static dictionary fields re-synced ONLY when they actually differ. Generated
 * content/status/generatedAt are never touched.
 */
export function ensureKanjiSeeded(db: AppDb, targetLanguage: string) {
  const index = kanjiIndexFor(targetLanguage);
  if (index.length === 0) return;

  const existing = db
    .select({
      id: tables.kanjiEntries.id,
      char: tables.kanjiEntries.char,
      level: tables.kanjiEntries.level,
      position: tables.kanjiEntries.position,
      onyomi: tables.kanjiEntries.onyomi,
      kunyomi: tables.kanjiEntries.kunyomi,
      meaningsEn: tables.kanjiEntries.meaningsEn,
    })
    .from(tables.kanjiEntries)
    .where(eq(tables.kanjiEntries.targetLanguage, targetLanguage))
    .all();
  const byChar = new Map(existing.map((k) => [k.char, k]));

  db.transaction((tx) => {
    index.forEach((k, i) => {
      const row = byChar.get(k.char);
      if (!row) {
        tx.insert(tables.kanjiEntries)
          .values({
            id: nanoid(),
            targetLanguage,
            char: k.char,
            level: k.level,
            position: i,
            onyomi: k.on,
            kunyomi: k.kun,
            meaningsEn: k.en,
          })
          .onConflictDoNothing()
          .run();
        return;
      }
      const dirty =
        row.level !== k.level ||
        row.position !== i ||
        JSON.stringify(row.onyomi) !== JSON.stringify(k.on) ||
        JSON.stringify(row.kunyomi) !== JSON.stringify(k.kun) ||
        JSON.stringify(row.meaningsEn) !== JSON.stringify(k.en);
      if (dirty) {
        tx.update(tables.kanjiEntries)
          .set({
            level: k.level,
            position: i,
            onyomi: k.on,
            kunyomi: k.kun,
            meaningsEn: k.en,
          })
          .where(eq(tables.kanjiEntries.id, row.id))
          .run();
      }
    });
  });
}

export function listKanji(db: AppDb, targetLanguage: string) {
  ensureKanjiSeeded(db, targetLanguage);
  return db
    .select({
      char: tables.kanjiEntries.char,
      level: tables.kanjiEntries.level,
      status: tables.kanjiEntries.status,
      meaningsEn: tables.kanjiEntries.meaningsEn,
    })
    .from(tables.kanjiEntries)
    .where(eq(tables.kanjiEntries.targetLanguage, targetLanguage))
    .orderBy(asc(tables.kanjiEntries.position))
    .all();
}

export function findKanji(db: AppDb, targetLanguage: string, char: string) {
  return (
    db
      .select()
      .from(tables.kanjiEntries)
      .where(
        and(
          eq(tables.kanjiEntries.targetLanguage, targetLanguage),
          eq(tables.kanjiEntries.char, char)
        )
      )
      .limit(1)
      .get() ?? null
  );
}

const KANJI_RE = /[一-鿿々]/g;
const MAX_CHARS = 8;

/**
 * Batch dictionary lookup for the selection tooltip: unique kanji readings +
 * meanings, plus whole-selection JMdict word. Pure DB/data read.
 */
export function kanjiLookup(db: AppDb, targetLanguage: string, text: string) {
  const candidate = text.replace(/\s+/g, "");
  const word =
    candidate.length >= 2 && candidate.length <= 12
      ? lookupWord(candidate)
      : null;

  const chars = [...new Set(text.match(KANJI_RE) ?? [])].slice(0, MAX_CHARS);
  if (chars.length === 0) return { kanji: [], word };

  const rows = db
    .select()
    .from(tables.kanjiEntries)
    .where(
      and(
        eq(tables.kanjiEntries.targetLanguage, targetLanguage),
        inArray(tables.kanjiEntries.char, chars)
      )
    )
    .all();
  const byChar = new Map(rows.map((r) => [r.char, r]));

  const kanji = chars.flatMap((char) => {
    const entry = byChar.get(char);
    if (!entry) return [];
    const meaning =
      entry.status === "ready" && entry.content
        ? entry.content.meanings_tr.slice(0, 3).join(", ")
        : entry.meaningsEn.slice(0, 2).join(", ");
    const readings = [...entry.kunyomi.slice(0, 2), ...entry.onyomi.slice(0, 1)];
    return [{ char, reading: readings.join("・"), meaning }];
  });

  return { kanji, word };
}
