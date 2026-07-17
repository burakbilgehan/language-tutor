import { and, asc, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as tables from "@/db/schema";
import { CurriculumSchema } from "@/lib/llm/schemas";
import { chapterPrompt } from "@/lib/llm/prompts/curriculum";
import { grammarIndexFor } from "@/lib/grammar-index";
import {
  isLevelOf,
  levelOrdinal,
  levelOrdinalFor,
  remapLegacyLevel,
  schemeFor,
} from "@/lib/curriculum/levels";
import type { AppDb } from "./db-types";
import type { Gen } from "./llm-gen";

// Müfredat bölümü üretiminin ortam-bağımsız çekirdeği (jobs.ts'ten taşındı).
// Sunucu job'u ve statik moddaki client-api aynı fonksiyonu çağırır.

export function findChainTail(db: AppDb, curriculumId: string): string | null {
  const unitIds = db
    .select({ id: tables.units.id })
    .from(tables.units)
    .where(eq(tables.units.curriculumId, curriculumId))
    .all()
    .map((u) => u.id);
  if (unitIds.length === 0) return null;

  const mains = db
    .select()
    .from(tables.nodes)
    .where(eq(tables.nodes.nodeType, "main"))
    .all()
    .filter((n) => unitIds.includes(n.unitId));
  if (mains.length === 0) return null;

  const byId = new Map(mains.map((n) => [n.id, n]));
  const pointedAt = new Set(
    mains.map((n) => n.prereqNodeId).filter((p): p is string => !!p && byId.has(p))
  );
  // The tail is the main node that no other main node references as prereq.
  const tails = mains.filter((n) => !pointedAt.has(n.id));
  // A well-formed chain has exactly one tail; if malformed, prefer the one
  // reachable by walking from the head so we never append to a branch.
  const head = mains.find((n) => !n.prereqNodeId);
  if (head) {
    let cur = head;
    const seen = new Set<string>();
    while (!seen.has(cur.id)) {
      seen.add(cur.id);
      const next = mains.find((n) => n.prereqNodeId === cur.id);
      if (!next) return cur.id;
      cur = next;
    }
  }
  return tails[0]?.id ?? null;
}

/** Highest level (in the language's own scheme) already present as a chapter. */
export function topChapterLevel(
  db: AppDb,
  curriculumId: string,
  targetLanguage: string
): string | null {
  const chapters = db
    .select()
    .from(tables.curriculumChapters)
    .where(eq(tables.curriculumChapters.curriculumId, curriculumId))
    .orderBy(desc(tables.curriculumChapters.position))
    .all();
  return chapters.find((c) => isLevelOf(targetLanguage, c.level))?.level ?? null;
}

/**
 * Legacy self-heal: non-Japanese curricula created before per-language level
 * schemes stored JLPT strings ("N5"≈A1). Remap chapters + units onto the
 * language's real scheme by ordinal. No-op once everything is valid.
 */
function ensureLevelSchemeMigrated(db: AppDb) {
  const curricula = db.select().from(tables.curricula).all();
  for (const cur of curricula) {
    const profile = db
      .select()
      .from(tables.profiles)
      .where(eq(tables.profiles.id, cur.profileId))
      .limit(1)
      .get();
    if (!profile || schemeFor(profile.targetLanguage).name === "JLPT") continue;

    const chapters = db
      .select()
      .from(tables.curriculumChapters)
      .where(eq(tables.curriculumChapters.curriculumId, cur.id))
      .all();
    for (const ch of chapters) {
      const mapped = remapLegacyLevel(profile.targetLanguage, ch.level);
      if (mapped === ch.level) continue;
      db.transaction((tx) => {
        tx.update(tables.curriculumChapters)
          .set({
            level: mapped,
            position: levelOrdinalFor(profile.targetLanguage, mapped),
            // The auto-title was just the level string; keep custom titles.
            ...(ch.titleTr === ch.level ? { titleTr: mapped } : {}),
          })
          .where(eq(tables.curriculumChapters.id, ch.id))
          .run();
        tx.update(tables.units)
          .set({ level: mapped })
          .where(eq(tables.units.chapterId, ch.id))
          .run();
      });
    }
  }
}

/**
 * Backfill: an existing pre-chapters curriculum (units with chapterId=null)
 * gets a single "N4" chapter row (the old ceiling) so extend logic knows where
 * it stands. Idempotent — safe to call repeatedly.
 */
export function ensureChaptersBackfilled(db: AppDb) {
  ensureLevelSchemeMigrated(db);
  // drizzle eq(col, null) doesn't emit IS NULL; scan and filter in JS instead.
  const units = db.select().from(tables.units).all();
  const orphans = units.filter((u) => u.chapterId == null);
  if (orphans.length === 0) return;

  const byCurriculum = new Map<string, typeof orphans>();
  for (const u of orphans) {
    const list = byCurriculum.get(u.curriculumId) ?? [];
    list.push(u);
    byCurriculum.set(u.curriculumId, list);
  }

  for (const [curriculumId, unitList] of byCurriculum) {
    // Skip if this curriculum already has a chapter row (avoid dupes).
    const existing = db
      .select()
      .from(tables.curriculumChapters)
      .where(eq(tables.curriculumChapters.curriculumId, curriculumId))
      .limit(1)
      .get();
    const chapterId = existing?.id ?? nanoid();
    db.transaction((tx) => {
      if (!existing) {
        tx.insert(tables.curriculumChapters)
          .values({
            id: chapterId,
            curriculumId,
            level: "N4",
            position: levelOrdinal("N4"),
            status: "ready",
            titleTr: "N4",
            generatedAt: new Date(),
          })
          .onConflictDoNothing()
          .run();
      }
      for (const u of unitList) {
        tx.update(tables.units)
          .set({ chapterId, level: "N4" })
          .where(eq(tables.units.id, u.id))
          .run();
      }
    });
  }
}

/** Compact summary of already-taught units + covered grammar for the prompt. */
function buildPriorSummary(
  db: AppDb,
  curriculumId: string,
  targetLanguage: string,
  level: string
): string {
  const units = db
    .select()
    .from(tables.units)
    .where(eq(tables.units.curriculumId, curriculumId))
    .orderBy(asc(tables.units.position))
    .all();
  if (units.length === 0) return "";

  const unitLines = units
    .map((u) => `• ${u.titleTr}${u.theme ? ` (${u.theme})` : ""}`)
    .join("\n");

  // Grammar slugs at levels strictly below the target level.
  const targetOrd = levelOrdinalFor(targetLanguage, level);
  const coveredGrammar = grammarIndexFor(targetLanguage)
    .filter((g) => {
      const ord = levelOrdinalFor(targetLanguage, g.level);
      return ord >= 0 && ord < targetOrd;
    })
    .map((g) => g.title_tr);
  const grammarLine =
    coveredGrammar.length > 0
      ? `\nKapsanan dilbilgisi (özet): ${coveredGrammar.slice(0, 60).join(", ")}`
      : "";

  return `Önceki üniteler:\n${unitLines}${grammarLine}`;
}

/**
 * Generates ONE chapter (a level of the profile's scheme: JLPT/HSK/CEFR) and
 * appends it to the profile's single curriculum. The first chapter creates
 * the curriculum + side quests; later chapters stitch onto the existing
 * prereq chain. `level: null` means the scheme's first level.
 */
export async function generateChapter(
  db: AppDb,
  gen: Gen,
  profileId: string,
  levelArg: string | null,
  opts?: { modelUsed?: string }
): Promise<void> {
  const profile = db
    .select()
    .from(tables.profiles)
    .where(eq(tables.profiles.id, profileId))
    .limit(1)
    .get();
  if (!profile) throw new Error("Profil bulunamadı");

  const level = levelArg ?? schemeFor(profile.targetLanguage).levels[0];
  if (!isLevelOf(profile.targetLanguage, level)) {
    throw new Error(`Geçersiz seviye: ${level}`);
  }

  ensureChaptersBackfilled(db);

  // Resolve (or create) the profile's single curriculum.
  const curriculum = db
    .select()
    .from(tables.curricula)
    .where(eq(tables.curricula.profileId, profileId))
    .limit(1)
    .get();
  const isFirst = !curriculum;
  const curriculumId = curriculum?.id ?? nanoid();
  if (!curriculum) {
    db.insert(tables.curricula)
      .values({ id: curriculumId, profileId, status: "generating" })
      .run();
  }

  // Concurrency guard: upsert the chapter row; abort if already done/in-flight.
  const existingChapter = db
    .select()
    .from(tables.curriculumChapters)
    .where(
      and(
        eq(tables.curriculumChapters.curriculumId, curriculumId),
        eq(tables.curriculumChapters.level, level)
      )
    )
    .limit(1)
    .get();
  if (
    existingChapter &&
    (existingChapter.status === "ready" ||
      existingChapter.status === "generating")
  ) {
    return; // someone else is on it / already done
  }
  const chapterId = existingChapter?.id ?? nanoid();
  if (existingChapter) {
    db.update(tables.curriculumChapters)
      .set({ status: "generating" })
      .where(eq(tables.curriculumChapters.id, chapterId))
      .run();
  } else {
    db.insert(tables.curriculumChapters)
      .values({
        id: chapterId,
        curriculumId,
        level,
        position: levelOrdinalFor(profile.targetLanguage, level),
        status: "generating",
        titleTr: level,
      })
      .onConflictDoNothing()
      .run();
  }

  const priorSummary = isFirst
    ? undefined
    : buildPriorSummary(db, curriculumId, profile.targetLanguage, level);

  const { system, prompt } = chapterPrompt({ profile, level, priorSummary });

  try {
    const chapter = await gen.generateJson({
      system,
      prompt,
      schema: CurriculumSchema,
      fixtureKey: "curriculum",
      tier: "deep",
      timeoutMs: 600_000,
    });

    // Compute append anchors OUTSIDE the transaction (reads only).
    const basePositionRow = db
      .select({ position: tables.units.position })
      .from(tables.units)
      .where(eq(tables.units.curriculumId, curriculumId))
      .orderBy(desc(tables.units.position))
      .limit(1)
      .all();
    const basePosition =
      basePositionRow.length > 0 ? basePositionRow[0].position + 1 : 0;
    const chainTail = findChainTail(db, curriculumId);
    const hasSideQuests =
      db
        .select()
        .from(tables.nodes)
        .where(eq(tables.nodes.nodeType, "side_quest"))
        .limit(1)
        .get() != null;

    db.transaction((tx) => {
      if (isFirst) {
        tx.update(tables.curricula)
          .set({
            title: chapter.title,
            status: "ready",
            modelUsed: opts?.modelUsed ?? "deep",
            generatedAt: new Date(),
          })
          .where(eq(tables.curricula.id, curriculumId))
          .run();
      } else {
        // Ensure the curriculum stays ready even if it was somehow left pending.
        tx.update(tables.curricula)
          .set({ status: "ready" })
          .where(eq(tables.curricula.id, curriculumId))
          .run();
      }

      let prevMainNodeId: string | null = chainTail;
      let firstUnitId: string | null = null;

      chapter.units.forEach((unit, ui) => {
        const unitId = nanoid();
        firstUnitId ??= unitId;
        tx.insert(tables.units)
          .values({
            id: unitId,
            curriculumId,
            chapterId,
            level,
            position: basePosition + ui,
            titleTr: unit.title_tr,
            descriptionTr: unit.description_tr,
            theme: unit.theme,
          })
          .run();

        unit.nodes.forEach((node, ni) => {
          const nodeId = nanoid();
          tx.insert(tables.nodes)
            .values({
              id: nodeId,
              unitId,
              position: ni,
              nodeType: "main",
              lessonType: node.lesson_type,
              titleTr: node.title_tr,
              subtitleTr: node.subtitle_tr,
              objectives: node.objectives,
              xpReward: node.xp_reward,
              // Head of the whole curriculum is available; every other node
              // (including each chapter's first) starts locked and unlocks
              // when its prereq completes.
              status: prevMainNodeId === null ? "available" : "locked",
              prereqNodeId: prevMainNodeId,
            })
            .run();
          prevMainNodeId = nodeId;
        });
      });

      // Side quests: only ever created once (first chapter / none exist yet).
      if (isFirst && !hasSideQuests) {
        chapter.side_quests.forEach((sq, i) => {
          tx.insert(tables.nodes)
            .values({
              id: nanoid(),
              unitId: firstUnitId!,
              position: 1000 + i,
              nodeType: "side_quest",
              sideQuestKind: sq.kind,
              titleTr: sq.title_tr,
              subtitleTr: sq.description_tr,
              objectives: [],
              xpReward: 15,
              status: "available",
            })
            .run();
        });
      }

      // Grammar cheatsheet skeleton (idempotent; safe every chapter).
      grammarIndexFor(profile.targetLanguage).forEach((g, i) => {
        tx.insert(tables.grammarTopics)
          .values({
            id: nanoid(),
            targetLanguage: profile.targetLanguage,
            slug: g.slug,
            titleTr: g.title_tr,
            category: g.category,
            level: g.level,
            position: i,
          })
          .onConflictDoNothing()
          .run();
      });

      tx.update(tables.curriculumChapters)
        .set({ status: "ready", generatedAt: new Date() })
        .where(eq(tables.curriculumChapters.id, chapterId))
        .run();
    });
  } catch (err) {
    db.update(tables.curriculumChapters)
      .set({ status: "error" })
      .where(eq(tables.curriculumChapters.id, chapterId))
      .run();
    // An append failure must NOT knock a working curriculum back to error.
    if (isFirst) {
      db.update(tables.curricula)
        .set({ status: "error" })
        .where(eq(tables.curricula.id, curriculumId))
        .run();
    }
    throw err;
  }
}
