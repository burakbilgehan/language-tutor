import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, tables } from "@/db";
import { getActiveProfile } from "@/lib/profile";
import { kanjiIndexFor } from "@/lib/kanji-index";
import {
  queueKanjiLevel,
  recoverStaleJobs,
  topChapterLevel,
} from "@/lib/jobs";
import {
  isJlptLevel,
  levelOrdinal,
  type JlptLevel,
} from "@/lib/curriculum/levels";

export const runtime = "nodejs";

/**
 * Self-healing incremental seed, same contract as the grammar cheatsheet:
 * missing chars are inserted (status "pending"); existing rows get their
 * static dictionary fields re-synced ONLY when they actually differ (2000+
 * rows — unconditional updates on every GET would be wasteful). Generated
 * content/status/generatedAt are never touched.
 */
function ensureSeeded(targetLanguage: string) {
  const index = kanjiIndexFor(targetLanguage);
  if (index.length === 0) return;

  const existing = db.query.kanjiEntries
    .findMany({
      where: eq(tables.kanjiEntries.targetLanguage, targetLanguage),
      columns: {
        id: true,
        char: true,
        level: true,
        position: true,
        onyomi: true,
        kunyomi: true,
        meaningsEn: true,
      },
    })
    .sync();
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

export async function GET() {
  recoverStaleJobs();
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }
  ensureSeeded(profile.targetLanguage);

  const entries = db.query.kanjiEntries
    .findMany({
      where: eq(tables.kanjiEntries.targetLanguage, profile.targetLanguage),
      orderBy: [asc(tables.kanjiEntries.position)],
      columns: { char: true, level: true, status: true, meaningsEn: true },
    })
    .sync();

  // Auto-fill: opening the kanji list starts generating the learner's current
  // level in the background so examples are ready by default. "Current" =
  // the LOWEST level that still has pending entries, capped at the top
  // curriculum chapter (the chapter alone is wrong for legacy curricula:
  // they're backfilled as one "N4" chapter even when the learner is doing
  // hiragana). Only 'pending' — errored entries need the explicit per-level
  // button, never a silent background retry.
  const curriculum = db.query.curricula
    .findFirst({ where: eq(tables.curricula.profileId, profile.id) })
    .sync();
  const top = curriculum
    ? topChapterLevel(curriculum.id, profile.targetLanguage)
    : null;
  if (top && isJlptLevel(top)) {
    const autoLevel = entries
      .filter((e) => e.status === "pending" && isJlptLevel(e.level))
      .map((e) => e.level as JlptLevel)
      .filter((l) => levelOrdinal(l) <= levelOrdinal(top))
      .sort((a, b) => levelOrdinal(a) - levelOrdinal(b))[0];
    if (autoLevel) queueKanjiLevel(profile.targetLanguage, autoLevel, false);
  }

  return NextResponse.json({ entries });
}
