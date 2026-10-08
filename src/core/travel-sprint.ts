import { asc, eq, gte, and, like } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as tables from "@/db/schema";
import { AppError } from "@/lib/errors";
import {
  TRAVEL_SPRINT_JA,
  TRAVEL_SPRINT_THEME_PREFIX,
} from "@/lib/curriculum/travel-sprint-ja";
import { findChainTail } from "./curriculum-gen";
import { frontierNodeId } from "./lesson-window";
import type { AppDb } from "./db-types";

// T-099: splice the authored Japan travel sprint into an existing ja
// curriculum, right before the learner's frontier node, without touching any
// existing progress. Additive only: new unit/node rows, a position shift on
// the units that come after the sprint, and ONE prereq relink (the frontier
// node now waits for the sprint's tail). No schema change, no save bump.
//
//   before: ... -> P (completed) -> F (frontier) -> ...
//   after:  ... -> P -> S1 -> ... -> Sn -> F -> ...
//
// F keeps its status: if it was already available it stays openable, so the
// splice never re-locks something the learner could open before. The
// frontier read (first non-completed node by unit/node position) lands on S1
// because the sprint units take F's unit position, so the lesson window and
// the map both treat the sprint as "next".

function curriculumOf(db: AppDb, profileId: string) {
  return db
    .select()
    .from(tables.curricula)
    .where(eq(tables.curricula.profileId, profileId))
    .limit(1)
    .get();
}

export function hasTravelSprint(db: AppDb, curriculumId: string): boolean {
  const row = db
    .select({ id: tables.units.id })
    .from(tables.units)
    .where(
      and(
        eq(tables.units.curriculumId, curriculumId),
        like(tables.units.theme, `${TRAVEL_SPRINT_THEME_PREFIX}%`)
      )
    )
    .limit(1)
    .get();
  return !!row;
}

/** Whether the sprint can be offered to this profile at all. */
export function travelSprintAvailable(db: AppDb, profileId: string): boolean {
  const profile = db
    .select({ targetLanguage: tables.profiles.targetLanguage })
    .from(tables.profiles)
    .where(eq(tables.profiles.id, profileId))
    .limit(1)
    .get();
  if (profile?.targetLanguage !== "ja") return false;
  const curriculum = curriculumOf(db, profileId);
  if (!curriculum || curriculum.status !== "ready") return false;
  return !hasTravelSprint(db, curriculum.id);
}

/** Inserts the sprint; returns the id of its first node. Idempotent: a
 * second call throws `travel_sprint_exists` instead of inserting twice. */
export function insertTravelSprint(db: AppDb, profileId: string): string {
  const profile = db
    .select()
    .from(tables.profiles)
    .where(eq(tables.profiles.id, profileId))
    .limit(1)
    .get();
  if (!profile) throw new AppError("profile_missing");
  if (profile.targetLanguage !== "ja") throw new AppError("travel_sprint_unsupported");

  const curriculum = curriculumOf(db, profileId);
  if (!curriculum || curriculum.status !== "ready") {
    throw new AppError("curriculum_not_ready");
  }
  if (hasTravelSprint(db, curriculum.id)) throw new AppError("travel_sprint_exists");

  // Titles are plain columns in the curriculum's content language (T-031);
  // legacy null = tr.
  const lang: "tr" | "en" = curriculum.contentLang === "en" ? "en" : "tr";

  const frontierId = frontierNodeId(db, profileId);
  const frontier = frontierId
    ? db.select().from(tables.nodes).where(eq(tables.nodes.id, frontierId)).limit(1).get()
    : undefined;
  const frontierUnit = frontier
    ? db.select().from(tables.units).where(eq(tables.units.id, frontier.unitId)).limit(1).get()
    : undefined;

  // Anchor: splice before the frontier, or append after the tail when the
  // whole curriculum is already completed.
  let insertPosition: number;
  let chapterId: string | null;
  let level: string | null;
  let headPrereq: string | null;
  if (frontier && frontierUnit) {
    insertPosition = frontierUnit.position;
    chapterId = frontierUnit.chapterId;
    level = frontierUnit.level;
    headPrereq = frontier.prereqNodeId;
  } else {
    const units = db
      .select()
      .from(tables.units)
      .where(eq(tables.units.curriculumId, curriculum.id))
      .orderBy(asc(tables.units.position))
      .all();
    const last = units[units.length - 1];
    insertPosition = last ? last.position + 1 : 0;
    chapterId = last?.chapterId ?? null;
    level = last?.level ?? null;
    headPrereq = findChainTail(db, curriculum.id);
  }

  const headPrereqDone =
    headPrereq === null ||
    db
      .select({ status: tables.nodes.status })
      .from(tables.nodes)
      .where(eq(tables.nodes.id, headPrereq))
      .limit(1)
      .get()?.status === "completed";

  const sprint = TRAVEL_SPRINT_JA;
  let headId = "";

  db.transaction((tx) => {
    // Make room: every unit at or after the anchor moves down by the sprint
    // length. Read-then-write per row (sql.js-safe, no arithmetic SET).
    const toShift = tx
      .select({ id: tables.units.id, position: tables.units.position })
      .from(tables.units)
      .where(
        and(
          eq(tables.units.curriculumId, curriculum.id),
          gte(tables.units.position, insertPosition)
        )
      )
      .all();
    for (const u of toShift) {
      tx.update(tables.units)
        .set({ position: u.position + sprint.length })
        .where(eq(tables.units.id, u.id))
        .run();
    }

    let prev: string | null = headPrereq;
    sprint.forEach((unit, ui) => {
      const unitId = nanoid();
      tx.insert(tables.units)
        .values({
          id: unitId,
          curriculumId: curriculum.id,
          chapterId,
          level,
          position: insertPosition + ui,
          titleTr: unit.title[lang],
          descriptionTr: unit.description[lang],
          theme: `${TRAVEL_SPRINT_THEME_PREFIX}:${unit.key}`,
        })
        .run();
      unit.nodes.forEach((node, ni) => {
        const nodeId = nanoid();
        const isHead = ui === 0 && ni === 0;
        if (isHead) headId = nodeId;
        tx.insert(tables.nodes)
          .values({
            id: nodeId,
            unitId,
            position: ni,
            nodeType: "main",
            lessonType: node.lessonType,
            titleTr: node.title[lang],
            subtitleTr: node.subtitle[lang],
            objectives: node.objectives[lang],
            xpReward: node.xp,
            status: isHead && headPrereqDone ? "available" : "locked",
            prereqNodeId: prev,
          })
          .run();
        prev = nodeId;
      });
    });

    // The single relink: the old frontier now follows the sprint's tail.
    if (frontier) {
      tx.update(tables.nodes)
        .set({ prereqNodeId: prev })
        .where(eq(tables.nodes.id, frontier.id))
        .run();
    }
  });

  return headId;
}
