import { and, desc, eq, inArray } from "drizzle-orm";
import * as schema from "@/db/schema";
import type { AppDb } from "./db-types";

// Env-agnostic job-queue core (T-034). Runs against better-sqlite3 (server)
// and sql.js (browser) alike, so it uses the query-builder API only — no
// db.query.* (see db-types.ts). generation_jobs has no JSON columns.
//
// System vs user-batch is derived from jobType ALONE — no "source" column,
// which would change the table shape and force a SAVE_SCHEMA_VERSION bump
// (T-034 item 11). Coarse but sufficient: the pop shows a total count, the
// panel shows the jobType label.
//   - lesson / chapter / curriculum = SYSTEM (prefetch, auto-extend)
//   - grammar / vocab / kanji        = USER BATCH ("üret" actions)

export type JobRow = typeof schema.generationJobs.$inferSelect;
export type JobType = JobRow["jobType"];
export type JobStatus = JobRow["status"];

const USER_BATCH_TYPES = new Set<JobType>(["grammar", "vocab", "kanji"]);

/** True for user-initiated batch jobs (grammar/vocab/kanji "üret"). The rest
 * (lesson prefetch, chapter auto-extend) are system jobs the learner never
 * asked for directly and should not accidentally cancel. */
export function isUserBatchJob(jobType: JobType): boolean {
  return USER_BATCH_TYPES.has(jobType);
}

export type JobKind = "system" | "user";
export function jobKind(jobType: JobType): JobKind {
  return isUserBatchJob(jobType) ? "user" : "system";
}

export interface JobSummary {
  id: string;
  jobType: JobType;
  refId: string;
  status: JobStatus;
  kind: JobKind;
  error: string | null;
  createdAt: number | null;
  startedAt: number | null;
  finishedAt: number | null;
}

const ACTIVE_STATUSES: JobStatus[] = ["queued", "running", "pending_approval"];
const HISTORY_STATUSES: JobStatus[] = ["done", "error", "cancelled"];

function toMs(v: Date | null): number | null {
  return v ? v.getTime() : null;
}

function toSummary(j: JobRow): JobSummary {
  return {
    id: j.id,
    jobType: j.jobType,
    refId: j.refId,
    status: j.status,
    kind: jobKind(j.jobType),
    error: j.error,
    createdAt: toMs(j.createdAt),
    startedAt: toMs(j.startedAt),
    finishedAt: toMs(j.finishedAt),
  };
}

export interface JobsSnapshot {
  active: JobSummary[];
  history: JobSummary[];
  /** Active-job counts for the global pop. `total` drives the badge; `user`
   * drives whether "stop all" is offered (system-only ⇒ no bulk button). */
  counts: { total: number; user: number; system: number; pendingApproval: number };
}

/**
 * Read-only snapshot for the pop + panel. NO LLM, NO profile scoping (jobs
 * aren't profile-owned and the pop mounts globally, including onboarding).
 * `historyLimit` caps the finished/errored/cancelled tail (newest first).
 */
export function listJobs(db: AppDb, historyLimit = 30): JobsSnapshot {
  const active = db
    .select()
    .from(schema.generationJobs)
    .where(inArray(schema.generationJobs.status, ACTIVE_STATUSES))
    .all()
    .sort(
      (a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0)
    )
    .map(toSummary);

  const history = db
    .select()
    .from(schema.generationJobs)
    .where(inArray(schema.generationJobs.status, HISTORY_STATUSES))
    .orderBy(desc(schema.generationJobs.finishedAt))
    .limit(historyLimit)
    .all()
    .map(toSummary);

  let user = 0;
  let system = 0;
  let pendingApproval = 0;
  for (const j of active) {
    if (j.kind === "user") user++;
    else system++;
    if (j.status === "pending_approval") pendingApproval++;
  }

  return {
    active,
    history,
    counts: { total: active.length, user, system, pendingApproval },
  };
}

/**
 * Cancel a single job.
 *   - queued / pending_approval → DELETE the row. This also releases the
 *     createJob dedupe lock (it only dedupes on queued/running) and makes the
 *     sequential driver loop no-op on that id via runJob's status guard.
 *   - running → flip to "cancelled". The CLI child can't be killed, so the
 *     in-flight LLM call still completes and writes its content (those tokens
 *     are already spent), but runJob re-reads the row after the await and
 *     skips the "done" write, and — for user batches — the queue stops
 *     because subsequent queued rows are (or will be) removed too.
 * Returns the resulting disposition, or null if the job doesn't exist.
 */
export function cancelJob(
  db: AppDb,
  jobId: string
): "deleted" | "cancelling" | "noop" | null {
  const job = db
    .select()
    .from(schema.generationJobs)
    .where(eq(schema.generationJobs.id, jobId))
    .limit(1)
    .get();
  if (!job) return null;

  if (job.status === "queued" || job.status === "pending_approval") {
    db.delete(schema.generationJobs)
      .where(eq(schema.generationJobs.id, jobId))
      .run();
    return "deleted";
  }
  if (job.status === "running") {
    db.update(schema.generationJobs)
      .set({ status: "cancelled", finishedAt: new Date() })
      .where(eq(schema.generationJobs.id, jobId))
      .run();
    return "cancelling";
  }
  // done / error / cancelled — nothing to do.
  return "noop";
}

/**
 * Bulk cancel. Default (`userOnly` true) targets user batches only, so the
 * learner never accidentally kills lesson prefetch / chapter auto-extend and
 * then complains that node opens got slow (T-034 item 10). Queued rows are
 * deleted, running rows flipped to "cancelled". Returns affected job ids so
 * the caller can react (e.g. server can stop treating them as in-flight).
 */
export function cancelAllJobs(
  db: AppDb,
  opts: { userOnly?: boolean } = {}
): { deleted: string[]; cancelling: string[] } {
  const userOnly = opts.userOnly ?? true;
  const candidates = db
    .select()
    .from(schema.generationJobs)
    .where(inArray(schema.generationJobs.status, ["queued", "running"]))
    .all()
    .filter((j) => !userOnly || isUserBatchJob(j.jobType));

  const deleted: string[] = [];
  const cancelling: string[] = [];
  for (const j of candidates) {
    if (j.status === "queued") {
      db.delete(schema.generationJobs)
        .where(eq(schema.generationJobs.id, j.id))
        .run();
      deleted.push(j.id);
    } else {
      db.update(schema.generationJobs)
        .set({ status: "cancelled", finishedAt: new Date() })
        .where(eq(schema.generationJobs.id, j.id))
        .run();
      cancelling.push(j.id);
    }
  }
  return { deleted, cancelling };
}

/**
 * Flip every `pending_approval` job back to `queued` so the caller can drive
 * them (boot-recovery "devam et?" action). Core only mutates rows; the actual
 * runJob firing stays in the server shell (src/lib/jobs.ts), which owns the
 * LLM provider. Returns the resumed job ids.
 */
export function resumePendingJobs(db: AppDb): string[] {
  const pending = db
    .select({ id: schema.generationJobs.id })
    .from(schema.generationJobs)
    .where(eq(schema.generationJobs.status, "pending_approval"))
    .all();
  const ids = pending.map((p) => p.id);
  if (ids.length > 0) {
    db.update(schema.generationJobs)
      .set({ status: "queued" })
      .where(
        and(
          inArray(schema.generationJobs.id, ids),
          eq(schema.generationJobs.status, "pending_approval")
        )
      )
      .run();
  }
  return ids;
}
