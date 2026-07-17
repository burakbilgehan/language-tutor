import { asc, eq } from "drizzle-orm";
import * as tables from "@/db/schema";
import { totalXp, getStreak } from "./xp";
import { nextLevelFor, isLevelOf, schemeFor } from "@/lib/curriculum/levels";
import type { AppDb } from "./db-types";

export function getRoadmap(
  db: AppDb,
  profileId: string,
  opts?: {
    /** Sunucu tarafında legacy-DB self-heal (ensureChaptersBackfilled).
     * Tarayıcı kopyaları zaten backfill edilmiş save'lerden gelir — orada
     * geçilmez. */
    ensureBackfilled?: () => void;
  }
) {
  const profile = db
    .select()
    .from(tables.profiles)
    .where(eq(tables.profiles.id, profileId))
    .limit(1)
    .get();
  if (!profile) return null;
  const lang = profile.targetLanguage;

  const curriculum = db
    .select()
    .from(tables.curricula)
    .where(eq(tables.curricula.profileId, profileId))
    .limit(1)
    .get();
  if (!curriculum || curriculum.status !== "ready") return null;

  opts?.ensureBackfilled?.();

  const chapterRows = db
    .select()
    .from(tables.curriculumChapters)
    .where(eq(tables.curriculumChapters.curriculumId, curriculum.id))
    .orderBy(asc(tables.curriculumChapters.position))
    .all();
  const topLevel = [...chapterRows]
    .reverse()
    .find((c) => isLevelOf(lang, c.level))?.level;
  const generatingChapter = chapterRows.find((c) => c.status === "generating");

  const unitRows = db
    .select()
    .from(tables.units)
    .where(eq(tables.units.curriculumId, curriculum.id))
    .orderBy(asc(tables.units.position))
    .all();

  const allNodes = unitRows.flatMap((u) =>
    db
      .select()
      .from(tables.nodes)
      .where(eq(tables.nodes.unitId, u.id))
      .orderBy(asc(tables.nodes.position))
      .all()
  );

  const mainByUnit = new Map<string, typeof allNodes>();
  const sideQuests: typeof allNodes = [];
  for (const n of allNodes) {
    if (n.nodeType === "side_quest") {
      sideQuests.push(n);
    } else {
      const list = mainByUnit.get(n.unitId) ?? [];
      list.push(n);
      mainByUnit.set(n.unitId, list);
    }
  }

  const next = topLevel ? nextLevelFor(lang, topLevel) : null;
  const scheme = schemeFor(lang);

  return {
    curriculum: { id: curriculum.id, title: curriculum.title },
    levelScheme: scheme.name,
    finalLevel: scheme.levels[scheme.levels.length - 1],
    units: unitRows.map((u) => ({
      id: u.id,
      titleTr: u.titleTr,
      descriptionTr: u.descriptionTr,
      theme: u.theme,
      level: u.level,
      nodes: (mainByUnit.get(u.id) ?? []).map(publicNode),
    })),
    sideQuests: sideQuests.map(publicNode),
    chapters: chapterRows.map((c) => ({
      level: c.level,
      status: c.status,
    })),
    topLevel: topLevel ?? null,
    nextLevel: next,
    isGenerating: generatingChapter?.level ?? null,
    xpTotal: totalXp(db, profileId),
    streak: getStreak(db, profileId),
  };
}

function publicNode(n: typeof tables.nodes.$inferSelect) {
  return {
    id: n.id,
    nodeType: n.nodeType,
    sideQuestKind: n.sideQuestKind,
    lessonType: n.lessonType,
    titleTr: n.titleTr,
    subtitleTr: n.subtitleTr,
    objectives: n.objectives,
    xpReward: n.xpReward,
    status: n.status,
  };
}

export type Roadmap = NonNullable<ReturnType<typeof getRoadmap>>;

/** Mark node completed and unlock its successor. Returns unlocked node ids. */
export function completeNode(db: AppDb, nodeId: string): string[] {
  const node = db
    .select()
    .from(tables.nodes)
    .where(eq(tables.nodes.id, nodeId))
    .limit(1)
    .get();
  if (!node) throw new Error("Node bulunamadı");
  if (node.nodeType === "side_quest") return []; // side quests stay available

  db.update(tables.nodes)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(tables.nodes.id, nodeId))
    .run();

  const successors = db
    .select()
    .from(tables.nodes)
    .where(eq(tables.nodes.prereqNodeId, nodeId))
    .all()
    .filter((n) => n.status === "locked");

  for (const s of successors) {
    db.update(tables.nodes)
      .set({ status: "available" })
      .where(eq(tables.nodes.id, s.id))
      .run();
  }
  return successors.map((s) => s.id);
}

/**
 * True if this main node is the tail of the whole curriculum chain, i.e. no
 * other main node lists it as prereq. Side quests are never a tail. Pure read;
 * used by the complete route to decide whether to auto-extend.
 */
export function isCurriculumTail(db: AppDb, nodeId: string): boolean {
  const node = db
    .select()
    .from(tables.nodes)
    .where(eq(tables.nodes.id, nodeId))
    .limit(1)
    .get();
  if (!node || node.nodeType === "side_quest") return false;
  const successor = db
    .select()
    .from(tables.nodes)
    .where(eq(tables.nodes.prereqNodeId, nodeId))
    .limit(1)
    .get();
  return !successor;
}
