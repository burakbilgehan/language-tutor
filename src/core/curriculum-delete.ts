import { and, eq, inArray } from "drizzle-orm";
import * as tables from "@/db/schema";
import { AppError } from "@/lib/errors";
import { cancelJob } from "./jobs";
import type { AppDb } from "./db-types";

// T-082. Destructive curriculum operations, env-agnostic (server route shell +
// static client-api call the same functions). Query-builder API only, per
// db-types.ts — the sql.js driver breaks db.query.*.
//
// Two operations, deliberately different in blast radius:
//   - deleteCurriculum: throws away a whole generated curriculum so it can be
//     regenerated, optionally from a mid-scheme level.
//   - discardLesson: throws away ONE node's cached lesson so it regenerates on
//     next open. Node completion state is untouched.

/**
 * What a curriculum delete destroys, counted BEFORE the delete runs so the UI
 * can report it and the tests can assert on it.
 */
export interface CurriculumDeletionCounts {
  chapters: number;
  units: number;
  nodes: number;
  lessons: number;
  exercises: number;
  attempts: number;
}

export interface DeleteCurriculumResult {
  deleted: CurriculumDeletionCounts;
  /** Chapter/lesson jobs whose queued rows were removed for this profile. */
  cancelledJobs: string[];
}

/** Job ids (queued/running/pending_approval) that would write into this
 * profile's curriculum if they resolved. Chapter jobs are keyed
 * `${profileId}:${level}`; lesson jobs are keyed by nodeId. */
function activeCurriculumJobs(
  db: AppDb,
  profileId: string,
  nodeIds: string[]
): { id: string; status: string }[] {
  const nodeIdSet = new Set(nodeIds);
  return db
    .select({
      id: tables.generationJobs.id,
      status: tables.generationJobs.status,
      jobType: tables.generationJobs.jobType,
      refId: tables.generationJobs.refId,
    })
    .from(tables.generationJobs)
    .where(
      inArray(tables.generationJobs.status, [
        "queued",
        "running",
        "pending_approval",
      ])
    )
    .all()
    .filter((j) => {
      if (j.jobType === "chapter" || j.jobType === "curriculum") {
        return j.refId === profileId || j.refId.startsWith(`${profileId}:`);
      }
      if (j.jobType === "lesson") return nodeIdSet.has(j.refId);
      return false;
    })
    .map((j) => ({ id: j.id, status: j.status }));
}

/**
 * Deletes the profile's entire curriculum: chapters, units, nodes, cached
 * lessons, and the exercises/attempts hanging off those lessons.
 *
 * SURVIVES, by design and by data model: XP events, streaks, SRS cards (they
 * are profile-level, keyed on profileId, not on the curriculum), the grammar /
 * kanji / vocab cheatsheet libraries (language-wide content, merely SEEDED
 * during chapter generation; deleting them would throw away packaged and
 * generated study material for no reason), llm_calls, and
 * `profiles.curriculum_pedagogy` (T-079/T-080: profile-level, and a
 * hand-edited body must not be destroyed by throwing away a bad curriculum).
 *
 * DIES, unavoidably: attempt history. Every attempt hangs off an exercise
 * (`attempts.exerciseId` notNull) which hangs off a lesson which hangs off a
 * node. There is no way to keep attempts while deleting the nodes they were
 * scored against, so the confirm dialog says so rather than promising
 * otherwise. XP already awarded for those attempts is NOT clawed back:
 * xp_events are independent rows keyed on profileId.
 *
 * Deletion order is child-to-parent because foreign keys are enforced in BOTH
 * runtimes (`PRAGMA foreign_keys = ON` in src/db/index.ts and src/db/browser.ts):
 *   attempts → exercises → lessons → nodes → units → chapters → curriculum.
 * Only the `attempts` delete is addressed by SUBQUERY (same pattern as
 * src/core/llm-gen.ts), because exercises are the widest set by far: one row
 * per question rather than per lesson. The exercise/lesson/node deletes bind
 * their id lists as parameters, which is fine at this scale: a full six-level
 * curriculum is a few hundred nodes and a few thousand exercises, against a
 * measured bound-parameter ceiling of ~20k on sql.js (the tighter of the two
 * runtimes) and 32k on better-sqlite3.
 *
 * The whole thing runs in ONE transaction. A partial delete would be worse
 * than no delete: `generateChapter` marks its head node `available` only when
 * `findChainTail` returns null, so a single surviving unit/node leaves a tail,
 * the regenerated curriculum's head is created `locked`, and the map is dead
 * with no error anywhere.
 *
 * In-flight generation is handled before the delete, not after: a `running`
 * chapter job cannot be stopped (the LLM child keeps going and its resolve
 * path looks the curriculum up by profileId, so it would happily append a
 * stale chapter into the freshly regenerated one). So a running job is a
 * refusal, and queued/pending rows are cancelled — `cancelJob` DELETES those
 * rows, which also releases `createJob`'s (jobType, refId) dedupe lock so a
 * regenerate at the same level can enqueue a fresh, actually-driven job.
 */
export function deleteCurriculum(
  db: AppDb,
  profileId: string
): DeleteCurriculumResult {
  // EVERY curriculum row for this profile, not just the first. The rest of the
  // app assumes one-per-profile and there is exactly one insert site enforcing
  // it (`generateChapter`, guarded by a preceding read), but `curricula` has no
  // unique index on profile_id, so the invariant is convention rather than
  // structure. A `.limit(1)` delete in that state would remove one curriculum
  // and leave the other's units and nodes behind, which is precisely the
  // partial-delete state described below: the regenerated head is chained
  // behind a stale node and comes out `locked`. Deleting by profile costs
  // nothing and cannot be wrong; adding the unique index would be the
  // structural fix but forces a SAVE_SCHEMA_VERSION bump.
  const curriculumIds = db
    .select({ id: tables.curricula.id })
    .from(tables.curricula)
    .where(eq(tables.curricula.profileId, profileId))
    .all()
    .map((c) => c.id);
  if (curriculumIds.length === 0) throw new AppError("curriculum_missing");

  const unitIds = db
    .select({ id: tables.units.id })
    .from(tables.units)
    .where(inArray(tables.units.curriculumId, curriculumIds))
    .all()
    .map((u) => u.id);

  // nodes has no curriculumId; it reaches the curriculum through units.
  const nodeIds =
    unitIds.length > 0
      ? db
          .select({ id: tables.nodes.id })
          .from(tables.nodes)
          .where(inArray(tables.nodes.unitId, unitIds))
          .all()
          .map((n) => n.id)
      : [];

  const jobs = activeCurriculumJobs(db, profileId, nodeIds);
  if (jobs.some((j) => j.status === "running")) {
    // Refusing beats racing: see the doc comment above.
    throw new AppError("curriculum_job_running");
  }
  const cancelledJobs: string[] = [];
  for (const j of jobs) {
    cancelJob(db, j.id);
    cancelledJobs.push(j.id);
  }

  const lessonIds =
    nodeIds.length > 0
      ? db
          .select({ id: tables.lessons.id })
          .from(tables.lessons)
          .where(inArray(tables.lessons.nodeId, nodeIds))
          .all()
          .map((l) => l.id)
      : [];
  const exerciseIds =
    lessonIds.length > 0
      ? db
          .select({ id: tables.exercises.id })
          .from(tables.exercises)
          .where(inArray(tables.exercises.lessonId, lessonIds))
          .all()
          .map((e) => e.id)
      : [];
  const attemptCount =
    exerciseIds.length > 0
      ? db
          .select({ id: tables.attempts.id })
          .from(tables.attempts)
          .where(inArray(tables.attempts.exerciseId, exerciseIds))
          .all().length
      : 0;
  const chapterCount = db
    .select({ id: tables.curriculumChapters.id })
    .from(tables.curriculumChapters)
    .where(inArray(tables.curriculumChapters.curriculumId, curriculumIds))
    .all().length;

  const deleted: CurriculumDeletionCounts = {
    chapters: chapterCount,
    units: unitIds.length,
    nodes: nodeIds.length,
    lessons: lessonIds.length,
    exercises: exerciseIds.length,
    attempts: attemptCount,
  };

  db.transaction((tx) => {
    if (lessonIds.length > 0) {
      tx.delete(tables.attempts)
        .where(
          inArray(
            tables.attempts.exerciseId,
            tx
              .select({ id: tables.exercises.id })
              .from(tables.exercises)
              .where(inArray(tables.exercises.lessonId, lessonIds))
          )
        )
        .run();
      tx.delete(tables.exercises)
        .where(inArray(tables.exercises.lessonId, lessonIds))
        .run();
    }
    if (nodeIds.length > 0) {
      tx.delete(tables.lessons)
        .where(inArray(tables.lessons.nodeId, nodeIds))
        .run();
      tx.delete(tables.nodes).where(inArray(tables.nodes.id, nodeIds)).run();
    }
    tx.delete(tables.units)
      .where(inArray(tables.units.curriculumId, curriculumIds))
      .run();
    tx.delete(tables.curriculumChapters)
      .where(inArray(tables.curriculumChapters.curriculumId, curriculumIds))
      .run();
    tx.delete(tables.curricula)
      .where(inArray(tables.curricula.id, curriculumIds))
      .run();
  });

  return { deleted, cancelledJobs };
}

export interface DiscardLessonResult {
  /** True when there was a cached lesson row to throw away. */
  had: boolean;
  exercises: number;
  attempts: number;
  cancelledJobs: string[];
}

/**
 * Throws away ONE node's cached lesson so the next open regenerates it from
 * scratch. The node row itself (and therefore its completion state, XP already
 * awarded, and its place in the prereq chain) is untouched.
 *
 * The lessons ROW is deleted rather than blanked. `openNode` treats a missing
 * row and a row with no content identically (`!lesson || !content` →
 * needsGeneration), and `generateLessonContent` upserts (`existing?.id ??
 * nanoid()`), so both work; deleting is the cleaner of the two because it also
 * clears the per-language content map and the `status` stamp, and a row left
 * at "error" is exactly what T-070-B made block silent regeneration.
 *
 * Unlike regenerate-with-feedback this deletes ALL languages' exercises, not
 * just the active native language's: the whole cached lesson is being
 * discarded, and leaving another language's exercise set pointing at a deleted
 * lesson row is not possible under the FK anyway.
 *
 * An in-flight lesson job for this node is cancelled first; otherwise it
 * resolves after the delete and writes the very content the user discarded
 * back into place.
 */
export function discardLesson(db: AppDb, nodeId: string): DiscardLessonResult {
  const node = db
    .select({ id: tables.nodes.id })
    .from(tables.nodes)
    .where(eq(tables.nodes.id, nodeId))
    .limit(1)
    .get();
  if (!node) throw new AppError("not_found");

  const jobs = db
    .select({
      id: tables.generationJobs.id,
      status: tables.generationJobs.status,
    })
    .from(tables.generationJobs)
    .where(
      and(
        eq(tables.generationJobs.jobType, "lesson"),
        eq(tables.generationJobs.refId, nodeId),
        inArray(tables.generationJobs.status, [
          "queued",
          "running",
          "pending_approval",
        ])
      )
    )
    .all();
  // A running lesson job is only ~1 call and its writer path is a plain upsert
  // of THIS node's lesson, so unlike the chapter case there is nothing to
  // corrupt: it is flipped to "cancelled" (runJob's post-await status re-read
  // then skips the done-write) and the user simply regenerates.
  const cancelledJobs: string[] = [];
  for (const j of jobs) {
    cancelJob(db, j.id);
    cancelledJobs.push(j.id);
  }

  const lesson = db
    .select({ id: tables.lessons.id })
    .from(tables.lessons)
    .where(eq(tables.lessons.nodeId, nodeId))
    .limit(1)
    .get();
  if (!lesson) {
    return { had: false, exercises: 0, attempts: 0, cancelledJobs };
  }

  const exerciseIds = db
    .select({ id: tables.exercises.id })
    .from(tables.exercises)
    .where(eq(tables.exercises.lessonId, lesson.id))
    .all()
    .map((e) => e.id);
  const attemptCount =
    exerciseIds.length > 0
      ? db
          .select({ id: tables.attempts.id })
          .from(tables.attempts)
          .where(inArray(tables.attempts.exerciseId, exerciseIds))
          .all().length
      : 0;

  db.transaction((tx) => {
    if (exerciseIds.length > 0) {
      tx.delete(tables.attempts)
        .where(inArray(tables.attempts.exerciseId, exerciseIds))
        .run();
    }
    tx.delete(tables.exercises)
      .where(eq(tables.exercises.lessonId, lesson.id))
      .run();
    tx.delete(tables.lessons).where(eq(tables.lessons.id, lesson.id)).run();
  });

  return {
    had: true,
    exercises: exerciseIds.length,
    attempts: attemptCount,
    cancelledJobs,
  };
}
