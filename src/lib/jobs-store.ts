"use client";

// Browser-side job queue store (T-034, static mode). In static builds there
// is NO generation_jobs table — batch generation runs as an inline loop in
// client-api. This store gives the SAME pop + panel UI something to read and
// cancel: module-level state + subscribe, AbortController-per-batch for cancel.
//
// It mirrors the server's JobsSnapshot shape (src/core/jobs.ts) so the UI
// components are identical across modes. Server mode never touches this store;
// static mode never calls GET /api/jobs.

import type { JobSummary, JobsSnapshot, JobType } from "@/core/jobs";
import { jobKind, isUserBatchJob } from "@/core/jobs";

interface StoreJob extends JobSummary {
  /** Group id so a batch's items cancel together / count as one operation. */
  batchId: string;
}

let jobs: StoreJob[] = [];
const listeners = new Set<() => void>();
let seq = 0;
// One AbortController PER BATCH, not per item. Cancel must abort the shared
// signal the running loop checks each iteration — a per-item controller would
// be replaced by a fresh (non-aborted) one on the next startJob, so the loop
// never stops. Keyed by batchId; cleaned up when the batch's last job leaves.
const batchControllers = new Map<string, AbortController>();

function emit() {
  for (const l of listeners) l();
}

export function subscribeJobs(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function toSummary(j: StoreJob): JobSummary {
  const { batchId: _b, ...rest } = j;
  void _b;
  return rest;
}

const HISTORY_MAX = 30;
let history: JobSummary[] = [];

export function snapshotJobs(): JobsSnapshot {
  const active = jobs.map(toSummary);
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
    history: history.slice(0, HISTORY_MAX),
    counts: { total: active.length, user, system, pendingApproval },
  };
}

function pushHistory(job: StoreJob, status: "done" | "error" | "cancelled", error?: string) {
  history.unshift({
    ...toSummary(job),
    status,
    error: error ?? null,
    finishedAt: Date.now(),
  });
  if (history.length > HISTORY_MAX) history = history.slice(0, HISTORY_MAX);
}

/**
 * Register one running job. Returns { signal, done, fail }. The batch loop
 * checks `signal.aborted` at the top of each iteration (in-flight item still
 * finishes — same "can't kill the child" semantics as the server) and calls
 * done()/fail() as items resolve.
 */
export function startJob(
  jobType: JobType,
  refId: string,
  batchId: string
): {
  id: string;
  signal: AbortSignal;
  done: () => void;
  fail: (err: unknown) => void;
} {
  // Batch controller was created by newBatchId; fall back to a fresh one only
  // if a caller skipped that step (keeps the shared-signal invariant).
  let controller = batchControllers.get(batchId);
  if (!controller) {
    controller = new AbortController();
    batchControllers.set(batchId, controller);
  }
  const id = `local-${++seq}`;
  const job: StoreJob = {
    id,
    jobType,
    refId,
    status: "running",
    kind: jobKind(jobType),
    error: null,
    createdAt: Date.now(),
    startedAt: Date.now(),
    finishedAt: null,
    batchId,
  };
  jobs = [...jobs, job];
  emit();

  const remove = (status: "done" | "error" | "cancelled", error?: string) => {
    const cur = jobs.find((j) => j.id === id);
    if (cur) pushHistory(cur, status, error);
    jobs = jobs.filter((j) => j.id !== id);
    // NOTE: do NOT delete the batch controller here just because no job is
    // currently registered. A sequential batch registers ONE item at a time —
    // between item i's done() and item i+1's startJob there are zero active
    // jobs for this batch, and dropping the controller in that gap would let a
    // cancel land on nothing and the next startJob mint a fresh, non-aborted
    // one (defeating cancel). Controllers are cleaned up lazily in
    // newBatchId's counter space (ids are unique, so no reuse) — the map holds
    // one small object per historical batch, negligible for a single tab.
    emit();
  };

  return {
    id,
    signal: controller.signal,
    done: () => remove("done"),
    fail: (err) =>
      remove(
        controller.signal.aborted ? "cancelled" : "error",
        err instanceof Error ? err.message : String(err)
      ),
  };
}

/** New batch id — one per "üret" invocation, so its items cancel together.
 * Creates the shared AbortController up front. Also prunes controllers of
 * prior batches that have fully drained (no active jobs), so the map doesn't
 * grow across a long-lived tab — safe because those batches are finished. */
export function newBatchId(): string {
  const activeBatches = new Set(jobs.map((j) => j.batchId));
  for (const key of batchControllers.keys()) {
    if (!activeBatches.has(key)) batchControllers.delete(key);
  }
  const id = `batch-${++seq}`;
  batchControllers.set(id, new AbortController());
  return id;
}

/** Cancel one job by id (per-job button in the panel). Aborts the WHOLE batch
 * the job belongs to — static batches are inline sequential loops with no way
 * to skip a single mid-flight item, so cancel means "stop this generation run". */
export function cancelJobLocal(id: string): void {
  const job = jobs.find((j) => j.id === id);
  if (!job) return;
  batchControllers.get(job.batchId)?.abort();
  // The loop drops items via fail() as their in-flight generation settles;
  // reflect the cancel on every job of this batch immediately in the UI.
  for (const j of jobs) if (j.batchId === job.batchId) j.status = "cancelled";
  emit();
}

/** Bulk cancel; user batches only by default (matches server default). */
export function cancelAllJobsLocal(opts: { userOnly?: boolean } = {}): number {
  const userOnly = opts.userOnly ?? true;
  const targets = jobs.filter((j) => !userOnly || isUserBatchJob(j.jobType));
  const batches = new Set(targets.map((j) => j.batchId));
  for (const b of batches) batchControllers.get(b)?.abort();
  for (const j of targets) j.status = "cancelled";
  emit();
  return targets.length;
}
