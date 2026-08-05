import { test } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { DDL } from "@/db/ddl";
import { COLUMN_HEALS } from "@/db/heals";
import {
  deleteCurriculum,
  discardLesson,
} from "@/core/curriculum-delete";
import type { AppDb } from "@/core/db-types";
import { AppError } from "@/lib/errors";

// T-082. Destructive operations get unit tests rather than manual checking,
// because every failure mode here DESTROYS user data or silently bricks the
// map:
//
//   - deleting too much  → XP/streak/SRS/pedagogy loss the dialog promised
//                          would survive
//   - deleting too little → a surviving unit/node leaves a chain tail, so the
//                          regenerated curriculum's head node is created
//                          "locked" and the map is dead with no error anywhere
//   - deleting the wrong profile's rows → another language's whole curriculum
//   - leaving jobs behind → a stale queued row holds createJob's dedupe lock
//                          and the regenerate polls a job nothing drives
//
// Runs against a real better-sqlite3 database built from the SAME DDL the app
// ships (src/db/ddl.ts) with foreign_keys ON, so an out-of-order delete fails
// here exactly as it would in production and in the browser.

function testDb(): AppDb {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");
  for (const stmt of DDL) sqlite.exec(stmt);
  for (const stmt of COLUMN_HEALS) {
    try {
      sqlite.exec(stmt);
    } catch {
      // column already present in DDL — same tolerance as the runtime heal
    }
  }
  return drizzle(sqlite, { schema }) as unknown as AppDb;
}

const PEDAGOGY = {
  pedagogy: "x".repeat(500),
  targetLanguage: "nl",
  nativeLanguage: "tr",
  generatedAt: "2026-08-06T00:00:00.000Z",
  edited: true as const,
};

/**
 * A profile with one curriculum, one chapter, one unit, two chained nodes, a
 * cached lesson on each, exercises and attempts, plus the profile-level
 * survivors (XP, streak, SRS card, hand-edited pedagogy).
 */
function seedProfile(
  db: AppDb,
  profileId: string,
  opts: { targetLanguage?: string } = {}
) {
  const target = opts.targetLanguage ?? "nl";
  db.insert(schema.profiles)
    .values({
      id: profileId,
      targetLanguage: target,
      nativeLanguage: "tr",
      uiLanguage: "tr",
      displayName: profileId,
      goals: ["Günlük konuşma"],
      selfLevel: "zero",
      minutesPerWeek: 150,
      interests: ["Seyahat"],
      motivation: "",
      curriculumPedagogy: PEDAGOGY,
      isActive: true,
    })
    .run();
  db.insert(schema.curricula)
    .values({ id: `${profileId}-cur`, profileId, title: "T", status: "ready" })
    .run();
  db.insert(schema.curriculumChapters)
    .values({
      id: `${profileId}-chp`,
      curriculumId: `${profileId}-cur`,
      level: "A1",
      position: 0,
      status: "ready",
      titleTr: "A1",
    })
    .run();
  db.insert(schema.units)
    .values({
      id: `${profileId}-unit`,
      curriculumId: `${profileId}-cur`,
      chapterId: `${profileId}-chp`,
      level: "A1",
      position: 0,
      titleTr: "U1",
    })
    .run();

  for (const [i, nodeId] of [`${profileId}-n1`, `${profileId}-n2`].entries()) {
    db.insert(schema.nodes)
      .values({
        id: nodeId,
        unitId: `${profileId}-unit`,
        position: i,
        nodeType: "main",
        titleTr: `N${i}`,
        objectives: [],
        status: i === 0 ? "completed" : "available",
        prereqNodeId: i === 0 ? null : `${profileId}-n1`,
      })
      .run();
    db.insert(schema.lessons)
      .values({
        id: `${nodeId}-les`,
        nodeId,
        status: "ready",
        content: { tr: { title_tr: "x" } } as never,
      })
      .run();
    db.insert(schema.exercises)
      .values({
        id: `${nodeId}-ex`,
        lessonId: `${nodeId}-les`,
        lang: "tr",
        position: 0,
        type: "mcq",
        promptTr: "p",
        answer: "a",
        grading: "deterministic",
      })
      .run();
    db.insert(schema.attempts)
      .values({
        id: `${nodeId}-att`,
        exerciseId: `${nodeId}-ex`,
        response: "a",
        isCorrect: true,
        score: 100,
        gradedBy: "deterministic",
      })
      .run();
  }

  db.insert(schema.xpEvents)
    .values({
      id: `${profileId}-xp`,
      profileId,
      amount: 40,
      reason: "lesson_complete",
      refId: `${profileId}-n1`,
    })
    .run();
  db.insert(schema.streaks)
    .values({
      profileId,
      currentStreak: 7,
      longestStreak: 9,
      lastActivityDate: "2026-08-06",
    })
    .run();
  db.insert(schema.srsCards)
    .values({
      id: `${profileId}-card`,
      profileId,
      itemType: "vocab",
      front: "huis",
      back: "ev",
      lang: "tr",
      sourceLessonId: `${profileId}-n1-les`,
      dueAt: new Date(),
    })
    .run();
  db.insert(schema.grammarTopics)
    .values({
      id: `${profileId}-gr`,
      targetLanguage: target,
      slug: "de-het",
      titleTr: "de/het",
      category: "c",
      level: "A1",
      status: "ready",
      content: { tr: { x: 1 } } as never,
    })
    .run();
}

const countOf = (db: AppDb, table: never) =>
  (db.select().from(table).all() as unknown[]).length;

test("delete: the curriculum graph dies, in FK order, in full", () => {
  const db = testDb();
  seedProfile(db, "p1");

  const result = deleteCurriculum(db, "p1");

  assert.deepEqual(result.deleted, {
    chapters: 1,
    units: 1,
    nodes: 2,
    lessons: 2,
    exercises: 2,
    attempts: 2,
  });
  assert.equal(countOf(db, schema.curricula as never), 0);
  assert.equal(countOf(db, schema.curriculumChapters as never), 0);
  assert.equal(countOf(db, schema.units as never), 0);
  assert.equal(countOf(db, schema.nodes as never), 0);
  assert.equal(countOf(db, schema.lessons as never), 0);
  assert.equal(countOf(db, schema.exercises as never), 0);
  // Attempts CANNOT survive: attempts.exerciseId is notNull and the whole
  // chain up to the curriculum is notNull too. The confirm dialog says so.
  assert.equal(countOf(db, schema.attempts as never), 0);
});

test("delete: profile-level progress survives", () => {
  const db = testDb();
  seedProfile(db, "p1");

  deleteCurriculum(db, "p1");

  assert.equal(countOf(db, schema.xpEvents as never), 1);
  assert.equal(countOf(db, schema.srsCards as never), 1);
  assert.equal(countOf(db, schema.streaks as never), 1);
  const streak = db
    .select()
    .from(schema.streaks)
    .where(eq(schema.streaks.profileId, "p1"))
    .get();
  assert.equal(streak?.currentStreak, 7);
  // Language-wide cheatsheet content is merely SEEDED by chapter generation;
  // it is not curriculum-owned and must not be thrown away with it.
  assert.equal(countOf(db, schema.grammarTopics as never), 1);
});

test("delete: a hand-edited pedagogy body survives (T-079/T-080)", () => {
  const db = testDb();
  seedProfile(db, "p1");

  deleteCurriculum(db, "p1");

  const profile = db
    .select()
    .from(schema.profiles)
    .where(eq(schema.profiles.id, "p1"))
    .get();
  assert.ok(profile, "the profile itself must survive");
  assert.deepEqual(profile.curriculumPedagogy, PEDAGOGY);
});

test("delete: another profile's curriculum is untouched", () => {
  const db = testDb();
  seedProfile(db, "p1", { targetLanguage: "nl" });
  seedProfile(db, "p2", { targetLanguage: "ja" });

  deleteCurriculum(db, "p1");

  assert.equal(countOf(db, schema.curricula as never), 1);
  assert.equal(countOf(db, schema.nodes as never), 2);
  assert.equal(countOf(db, schema.attempts as never), 2);
  const survivor = db.select().from(schema.curricula).get();
  assert.equal(survivor?.profileId, "p2");
});

test("delete: duplicate curricula for one profile are ALL removed", () => {
  // The app assumes one curriculum per profile and there is a single guarded
  // insert site enforcing it, but `curricula` has no unique index on
  // profile_id, so nothing structural prevents a second row. A delete that
  // took only the first would leave the other's units and nodes behind, and a
  // regenerate would then chain its new head behind that stale node and come
  // out `locked` — a dead map with no error. Pinned because the failure is
  // silent.
  const db = testDb();
  seedProfile(db, "p1");
  db.insert(schema.curricula)
    .values({ id: "p1-cur-2", profileId: "p1", title: "dupe", status: "ready" })
    .run();
  db.insert(schema.units)
    .values({
      id: "p1-unit-2",
      curriculumId: "p1-cur-2",
      level: "A1",
      position: 9,
      titleTr: "stale",
    })
    .run();
  db.insert(schema.nodes)
    .values({
      id: "p1-n-stale",
      unitId: "p1-unit-2",
      position: 0,
      nodeType: "main",
      titleTr: "stale",
      objectives: [],
      status: "available",
    })
    .run();

  const result = deleteCurriculum(db, "p1");

  assert.equal(countOf(db, schema.curricula as never), 0);
  assert.equal(countOf(db, schema.units as never), 0);
  assert.equal(countOf(db, schema.nodes as never), 0, "no stale node survives");
  assert.equal(result.deleted.units, 2);
  assert.equal(result.deleted.nodes, 3);
});

test("delete: no curriculum → curriculum_missing, nothing destroyed", () => {
  const db = testDb();
  seedProfile(db, "p1");
  db.delete(schema.attempts).run();
  db.delete(schema.exercises).run();
  db.delete(schema.lessons).run();
  db.delete(schema.nodes).run();
  db.delete(schema.units).run();
  db.delete(schema.curriculumChapters).run();
  db.delete(schema.curricula).run();

  assert.throws(
    () => deleteCurriculum(db, "p1"),
    (e: unknown) => e instanceof AppError && e.code === "curriculum_missing"
  );
  assert.equal(countOf(db, schema.xpEvents as never), 1);
});

test("delete: queued jobs for this profile are removed, others left alone", () => {
  const db = testDb();
  seedProfile(db, "p1");
  seedProfile(db, "p2", { targetLanguage: "ja" });
  const job = (id: string, jobType: "chapter" | "lesson" | "grammar", refId: string) =>
    db
      .insert(schema.generationJobs)
      .values({ id, jobType, refId, status: "queued" })
      .run();
  job("j-chapter", "chapter", "p1:A2");
  job("j-lesson", "lesson", "p1-n2");
  job("j-other-profile", "chapter", "p2:N5");
  job("j-grammar", "grammar", "p1-gr");

  const result = deleteCurriculum(db, "p1");

  assert.deepEqual(result.cancelledJobs.sort(), ["j-chapter", "j-lesson"]);
  const left = db
    .select({ id: schema.generationJobs.id })
    .from(schema.generationJobs)
    .all()
    .map((r) => r.id)
    .sort();
  // Queued rows are DELETED (not flipped): that is what releases createJob's
  // (jobType, refId) dedupe lock, so regenerating at the same level enqueues a
  // fresh job that something actually drives.
  assert.deepEqual(left, ["j-grammar", "j-other-profile"]);
});

test("delete: refused while a chapter job is running", () => {
  const db = testDb();
  seedProfile(db, "p1");
  db.insert(schema.generationJobs)
    .values({
      id: "j-running",
      jobType: "chapter",
      refId: "p1:A1",
      status: "running",
      startedAt: new Date(),
    })
    .run();

  // A running chapter job cannot be stopped (the LLM child keeps going) and its
  // writer looks the curriculum up by profileId, so letting the delete through
  // would append a stale chapter into the regenerated curriculum.
  assert.throws(
    () => deleteCurriculum(db, "p1"),
    (e: unknown) => e instanceof AppError && e.code === "curriculum_job_running"
  );
  assert.equal(countOf(db, schema.nodes as never), 2, "nothing deleted");
  assert.equal(countOf(db, schema.curricula as never), 1);
});

test("delete: a running job for ANOTHER profile does not block", () => {
  const db = testDb();
  seedProfile(db, "p1");
  seedProfile(db, "p2", { targetLanguage: "ja" });
  db.insert(schema.generationJobs)
    .values({
      id: "j-running",
      jobType: "chapter",
      refId: "p2:N5",
      status: "running",
      startedAt: new Date(),
    })
    .run();

  deleteCurriculum(db, "p1");
  assert.equal(countOf(db, schema.curricula as never), 1);
});

test("delete: a profileId prefix collision does not steal another job", () => {
  const db = testDb();
  seedProfile(db, "p1");
  // "p1x" starts with "p1" but is a different profile: matching must be on the
  // "p1:" boundary, not a bare prefix.
  db.insert(schema.generationJobs)
    .values({ id: "j-p1x", jobType: "chapter", refId: "p1x:A1", status: "running" })
    .run();

  const result = deleteCurriculum(db, "p1");
  assert.deepEqual(result.cancelledJobs, []);
  assert.equal(countOf(db, schema.generationJobs as never), 1);
});

test("discard: lesson cache dies, node completion survives", () => {
  const db = testDb();
  seedProfile(db, "p1");

  const result = discardLesson(db, "p1-n1");

  assert.deepEqual(
    { had: result.had, exercises: result.exercises, attempts: result.attempts },
    { had: true, exercises: 1, attempts: 1 }
  );
  assert.equal(countOf(db, schema.lessons as never), 1, "only this node's lesson");
  const node = db
    .select()
    .from(schema.nodes)
    .where(eq(schema.nodes.id, "p1-n1"))
    .get();
  assert.equal(node?.status, "completed", "completion state untouched");
  // XP already awarded is not clawed back.
  assert.equal(countOf(db, schema.xpEvents as never), 1);
  // The sibling node keeps its whole lesson.
  const sibling = db
    .select()
    .from(schema.lessons)
    .where(eq(schema.lessons.nodeId, "p1-n2"))
    .get();
  assert.ok(sibling);
  assert.equal(countOf(db, schema.exercises as never), 1);
});

test("discard: no cached lesson is a no-op, not an error", () => {
  const db = testDb();
  seedProfile(db, "p1");
  discardLesson(db, "p1-n1");

  const again = discardLesson(db, "p1-n1");
  assert.deepEqual(
    { had: again.had, exercises: again.exercises },
    { had: false, exercises: 0 }
  );
});

test("discard: unknown node → not_found", () => {
  const db = testDb();
  seedProfile(db, "p1");
  assert.throws(
    () => discardLesson(db, "nope"),
    (e: unknown) => e instanceof AppError && e.code === "not_found"
  );
});

test("discard: an in-flight lesson job for this node is cancelled", () => {
  const db = testDb();
  seedProfile(db, "p1");
  db.insert(schema.generationJobs)
    .values({ id: "j-q", jobType: "lesson", refId: "p1-n1", status: "queued" })
    .run();
  db.insert(schema.generationJobs)
    .values({ id: "j-r", jobType: "lesson", refId: "p1-n1", status: "running" })
    .run();
  db.insert(schema.generationJobs)
    .values({ id: "j-other", jobType: "lesson", refId: "p1-n2", status: "queued" })
    .run();

  const result = discardLesson(db, "p1-n1");

  assert.deepEqual(result.cancelledJobs.sort(), ["j-q", "j-r"]);
  const rows = db
    .select({ id: schema.generationJobs.id, status: schema.generationJobs.status })
    .from(schema.generationJobs)
    .all()
    .sort((a, b) => a.id.localeCompare(b.id));
  // queued → deleted (releases the dedupe lock), running → "cancelled" so
  // runJob's post-await re-read skips the done-write. Other nodes untouched.
  assert.deepEqual(rows, [
    { id: "j-other", status: "queued" },
    { id: "j-r", status: "cancelled" },
  ]);
});

test("delete after discard: the mixed state still deletes cleanly", () => {
  const db = testDb();
  seedProfile(db, "p1");
  discardLesson(db, "p1-n1"); // one node now has no lessons row at all

  const result = deleteCurriculum(db, "p1");

  assert.deepEqual(result.deleted, {
    chapters: 1,
    units: 1,
    nodes: 2,
    lessons: 1,
    exercises: 1,
    attempts: 1,
  });
  assert.equal(countOf(db, schema.nodes as never), 0);
  assert.equal(countOf(db, schema.units as never), 0);
});
