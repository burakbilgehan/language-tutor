import { asc, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { totalXp, getStreak } from "./xp";

export function getRoadmap(profileId: string) {
  const curriculum = db.query.curricula
    .findFirst({ where: eq(tables.curricula.profileId, profileId) })
    .sync();
  if (!curriculum || curriculum.status !== "ready") return null;

  const unitRows = db.query.units
    .findMany({
      where: eq(tables.units.curriculumId, curriculum.id),
      orderBy: [asc(tables.units.position)],
    })
    .sync();

  const allNodes = unitRows.flatMap((u) =>
    db.query.nodes
      .findMany({
        where: eq(tables.nodes.unitId, u.id),
        orderBy: [asc(tables.nodes.position)],
      })
      .sync()
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

  return {
    curriculum: { id: curriculum.id, title: curriculum.title },
    units: unitRows.map((u) => ({
      id: u.id,
      titleTr: u.titleTr,
      descriptionTr: u.descriptionTr,
      theme: u.theme,
      nodes: (mainByUnit.get(u.id) ?? []).map(publicNode),
    })),
    sideQuests: sideQuests.map(publicNode),
    xpTotal: totalXp(profileId),
    streak: getStreak(profileId),
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
export function completeNode(nodeId: string): string[] {
  const node = db.query.nodes
    .findFirst({ where: eq(tables.nodes.id, nodeId) })
    .sync();
  if (!node) throw new Error("Node bulunamadı");
  if (node.nodeType === "side_quest") return []; // side quests stay available

  db.update(tables.nodes)
    .set({ status: "completed", completedAt: new Date() })
    .where(eq(tables.nodes.id, nodeId))
    .run();

  const successors = db.query.nodes
    .findMany({ where: eq(tables.nodes.prereqNodeId, nodeId) })
    .sync()
    .filter((n) => n.status === "locked");

  for (const s of successors) {
    db.update(tables.nodes)
      .set({ status: "available" })
      .where(eq(tables.nodes.id, s.id))
      .run();
  }
  return successors.map((s) => s.id);
}
