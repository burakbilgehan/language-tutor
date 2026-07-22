import { and, asc, desc, eq, inArray, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, tables } from "@/db";
import { getProvider, LlmError } from "@/lib/llm/provider";
import { llmConfigured } from "@/lib/llm/config";
import {
  generateLessonContent,
  generateGrammarContent,
  generateKanjiContent,
  generateVocabContent,
} from "@/core/llm-gen";
import {
  generateChapter,
  ensureChaptersBackfilled as coreEnsureChaptersBackfilled,
  topChapterLevel as coreTopChapterLevel,
} from "@/core/curriculum-gen";
import {
  listJobs as coreListJobs,
  cancelJob as coreCancelJob,
  cancelAllJobs as coreCancelAllJobs,
  resumePendingJobs as coreResumePendingJobs,
} from "@/core/jobs";
import {
  CurriculumSchema,
  GrammarTopicSchema,
  KanjiContentSchema,
  LessonSchema,
} from "@/lib/llm/schemas";
import { chapterPrompt } from "@/lib/llm/prompts/curriculum";
import { lessonPrompt } from "@/lib/llm/prompts/lesson";
import { grammarPrompt } from "@/lib/llm/prompts/grammar";
import { kanjiPrompt } from "@/lib/llm/prompts/kanji";
import { grammarIndexFor } from "@/lib/grammar-index";
import { getStrugglesLine } from "@/lib/struggles";
import {
  levelOrdinal,
  isLevelOf,
  levelOrdinalFor,
  remapLegacyLevel,
  schemeFor,
} from "@/lib/curriculum/levels";

type JobType = (typeof tables.generationJobs.$inferSelect)["jobType"];

const STALE_MS = 15 * 60 * 1000;
const PROCESS_START = new Date();
let staleCheckDone = false;

/**
 * Recover from a dead process — WITHOUT assuming this is the only server.
 * Several processes share the DB (the UI dev server + a prod generation
 * worker), so a job this process doesn't recognize may be alive elsewhere:
 * declaring every predating job dead at boot wiped a full bulk queue twice.
 * Policy now: 'running' jobs are only declared dead past STALE_MS (longer
 * than any single generation); orphan 'queued' jobs are ADOPTED — re-driven
 * here, sequentially — instead of errored (left alone they would block
 * createJob's dedupe forever; errored they lose the whole backlog on every
 * restart). runJob's queued-status check keeps double-adoption harmless.
 * Resources left in 'generating' with no live job flip to 'error' so the UI
 * offers a retry instead of an eternal spinner.
 */
export function recoverStaleJobs() {
  if (staleCheckDone) return;
  staleCheckDone = true;

  const orphanError = {
    status: "error" as const,
    error: "Üretim süreci öldü, iş yarıda kaldı.",
    finishedAt: new Date(),
  };
  // Running jobs hung past every CLI timeout — dead no matter which process
  // owned them. Fresher running jobs may be live in another process: skip.
  db.update(tables.generationJobs)
    .set(orphanError)
    .where(
      and(
        eq(tables.generationJobs.status, "running"),
        lt(tables.generationJobs.startedAt, new Date(Date.now() - STALE_MS))
      )
    )
    .run();
  // Orphan queued jobs: their driving loop may have died with an old process.
  // BEHAVIOR CHANGE (T-034): we no longer auto-run them. Unconditionally
  // adopting + re-driving a queued backlog is right for a crash but a nasty
  // surprise for an imported/forgotten queue (silent token burn the user
  // never re-triggered). Instead we mark them `pending_approval`; the control
  // panel surfaces "N iş bekliyor — devam et?" and the user resumes manually
  // (resumePendingJobs → back to `queued` → runJob). Crash recovery is
  // preserved, just gated behind an explicit click. Marking (not running)
  // still releases nothing that createJob depends on: a pending_approval row
  // keeps the (jobType, refId) slot out of the dedupe check below, and the
  // resource is treated as live so it isn't flipped to error underneath.
  db.update(tables.generationJobs)
    .set({ status: "pending_approval" })
    .where(
      and(
        eq(tables.generationJobs.status, "queued"),
        lt(tables.generationJobs.createdAt, PROCESS_START)
      )
    )
    .run();

  // Resources stuck 'generating' with no live job → 'error' (retryable in UI).
  // `pending_approval` counts as live: those jobs are just awaiting the user's
  // "devam et?", their target resource must NOT be flipped to error underneath.
  const live = db.query.generationJobs
    .findMany({
      where: inArray(tables.generationJobs.status, [
        "queued",
        "running",
        "pending_approval",
      ]),
      columns: { jobType: true, refId: true },
    })
    .sync();
  const liveRefs = (type: JobType) =>
    new Set(live.filter((j) => j.jobType === type).map((j) => j.refId));

  const grammarLive = liveRefs("grammar");
  db.query.grammarTopics
    .findMany({
      where: eq(tables.grammarTopics.status, "generating"),
      columns: { id: true },
    })
    .sync()
    .filter((t) => !grammarLive.has(t.id))
    .forEach((t) => {
      db.update(tables.grammarTopics)
        .set({ status: "error" })
        .where(eq(tables.grammarTopics.id, t.id))
        .run();
    });

  const kanjiLive = liveRefs("kanji");
  db.query.kanjiEntries
    .findMany({
      where: eq(tables.kanjiEntries.status, "generating"),
      columns: { id: true },
    })
    .sync()
    .filter((k) => !kanjiLive.has(k.id))
    .forEach((k) => {
      db.update(tables.kanjiEntries)
        .set({ status: "error" })
        .where(eq(tables.kanjiEntries.id, k.id))
        .run();
    });

  const vocabLive = liveRefs("vocab");
  db.query.vocabEntries
    .findMany({
      where: eq(tables.vocabEntries.status, "generating"),
      columns: { id: true },
    })
    .sync()
    .filter((v) => !vocabLive.has(v.id))
    .forEach((v) => {
      db.update(tables.vocabEntries)
        .set({ status: "error" })
        .where(eq(tables.vocabEntries.id, v.id))
        .run();
    });

  const lessonLive = liveRefs("lesson");
  db.query.lessons
    .findMany({
      where: eq(tables.lessons.status, "generating"),
      columns: { id: true, nodeId: true },
    })
    .sync()
    .filter((l) => !lessonLive.has(l.nodeId))
    .forEach((l) => {
      db.update(tables.lessons)
        .set({ status: "error" })
        .where(eq(tables.lessons.id, l.id))
        .run();
    });
}

/**
 * Enqueue a generation job. Deduped centrally: if a job with the same
 * (jobType, refId) is already queued/running, its id is returned instead of
 * inserting a duplicate — the same resource is never paid for twice. The
 * check+insert is a synchronous block (no await), so it's atomic per process.
 */
export function createJob(jobType: JobType, refId: string): string {
  const inFlight = db.query.generationJobs
    .findFirst({
      where: and(
        eq(tables.generationJobs.jobType, jobType),
        eq(tables.generationJobs.refId, refId),
        inArray(tables.generationJobs.status, ["queued", "running"])
      ),
    })
    .sync();
  if (inFlight) return inFlight.id;

  const id = nanoid();
  db.insert(tables.generationJobs)
    .values({ id, jobType, refId, status: "queued" })
    .run();
  return id;
}

/**
 * Make sure a lesson exists or is being generated for a node. Returns null if
 * the lesson is already ready (nothing to do), otherwise the job id (existing
 * in-flight or freshly enqueued + fired). Used by the open route (on-demand)
 * and the complete route (prefetch for just-unlocked nodes).
 */
export function ensureLessonJob(nodeId: string): string | null {
  const lesson = db.query.lessons
    .findFirst({ where: eq(tables.lessons.nodeId, nodeId) })
    .sync();
  if (lesson?.status === "ready" && lesson.content) return null;
  // No LLM configured → don't enqueue jobs that would only error. Callers
  // (open route) surface an explicit "LLM gerekli" state instead.
  if (!llmConfigured()) return null;

  const jobId = createJob("lesson", nodeId);
  void runJob(jobId); // no-op if the returned job is already running
  return jobId;
}

// User-entered "what was wrong" text for an in-flight regenerate, keyed by
// nodeId. Transient, in-process only — the job row itself has no free-form
// payload column (and doesn't need one: runJob drives this in the same
// process that enqueued it, same as every other fire-and-forget job here).
const pendingRegenerationFeedback = new Map<string, string>();

/**
 * Force a fresh generation for a node whose lesson may already be ready —
 * lets stale/low-quality cached lessons be rebuilt under the current prompt.
 * The lesson row is flipped to "generating" up front so an open() racing the
 * queued job doesn't serve the stale copy. `feedback` is optional free text
 * describing what was wrong with the previous generation ("regenerate" UI) —
 * threaded into the lesson prompt as a "fix these issues" section.
 */
export function regenerateLessonJob(nodeId: string, feedback?: string | null): string {
  const lesson = db.query.lessons
    .findFirst({ where: eq(tables.lessons.nodeId, nodeId) })
    .sync();
  if (lesson) {
    db.update(tables.lessons)
      .set({ status: "generating" })
      .where(eq(tables.lessons.id, lesson.id))
      .run();
  }
  if (feedback?.trim()) pendingRegenerationFeedback.set(nodeId, feedback.trim());
  else pendingRegenerationFeedback.delete(nodeId);
  const jobId = createJob("lesson", nodeId);
  void runJob(jobId);
  return jobId;
}

/**
 * Fire lesson generation for the successor chain of `nodeId`, `depth` links
 * deep (default 3). Called when a lesson is OPENED: with a single-successor
 * lookahead the learner could finish a lesson faster than the next one
 * generates, so a 2-3 lesson buffer stays warm ahead of the unlock frontier
 * (open 20 → 21, 22, 23 queued). No extra LLM spend: these lessons would be
 * generated anyway; this only moves them earlier. Errored lessons are
 * skipped — retries stay user-driven (opening the node itself), not
 * poll-driven.
 */
export function prefetchSuccessorLessons(nodeId: string, depth = 3) {
  if (!llmConfigured()) return; // no LLM → no background error-job spam
  let frontier = [nodeId];
  for (let d = 0; d < depth && frontier.length > 0; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      const successors = db.query.nodes
        .findMany({
          where: and(
            eq(tables.nodes.prereqNodeId, id),
            eq(tables.nodes.nodeType, "main")
          ),
          columns: { id: true },
        })
        .sync();
      for (const s of successors) {
        const lesson = db.query.lessons
          .findFirst({ where: eq(tables.lessons.nodeId, s.id) })
          .sync();
        if (lesson?.status !== "error") ensureLessonJob(s.id);
        next.push(s.id);
      }
    }
    frontier = next;
  }
}

/**
 * Queue LLM content generation for every kanji of a level. Jobs are driven
 * SEQUENTIALLY (one 'running' at a time, rest stay 'queued'): kicking all ~80
 * at once would mark them all running and the 15-minute stale sweep would
 * kill the tail of the batch while it waits behind the concurrency-1 CLI
 * queue. Auto-fill passes includeErrors=false so failed entries are only
 * retried by an explicit user action, never in a background loop.
 * Returns how many jobs were queued.
 */
export function queueKanjiLevel(
  targetLanguage: string,
  level: string,
  includeErrors: boolean
): number {
  if (!llmConfigured()) return 0;
  const statuses = includeErrors ? ["pending", "error"] : ["pending"];
  const entries = db.query.kanjiEntries
    .findMany({
      where: and(
        eq(tables.kanjiEntries.targetLanguage, targetLanguage),
        eq(tables.kanjiEntries.level, level),
        inArray(tables.kanjiEntries.status, statuses as ("pending" | "error")[])
      ),
      orderBy: [asc(tables.kanjiEntries.position)],
      columns: { id: true },
    })
    .sync();
  if (entries.length === 0) return 0;

  const jobIds = entries.map((e) => createJob("kanji", e.id));
  void (async () => {
    for (const id of jobIds) {
      await runJob(id); // no-op for deduped ids already run elsewhere
    }
  })();
  return jobIds.length;
}

/**
 * Queue lesson generation for every main node of a profile that doesn't have
 * a ready lesson yet. Same sequential driving as queueKanjiLevel so the stale
 * sweep doesn't kill the tail of the batch. Explicit user action, so errored
 * lessons ARE retried (unlike prefetch). Nodes stuck in "generating" with no
 * in-flight job are recovered too: createJob dedupes live jobs and re-enqueues
 * dead ones. Returns how many jobs were queued.
 */
export function queueMissingLessons(profileId: string): number {
  if (!llmConfigured()) return 0;
  const curriculum = db.query.curricula
    .findFirst({ where: eq(tables.curricula.profileId, profileId) })
    .sync();
  if (!curriculum) return 0;

  const rows = db
    .select({ nodeId: tables.nodes.id, lessonStatus: tables.lessons.status })
    .from(tables.nodes)
    .innerJoin(tables.units, eq(tables.nodes.unitId, tables.units.id))
    .leftJoin(tables.lessons, eq(tables.lessons.nodeId, tables.nodes.id))
    .where(
      and(
        eq(tables.units.curriculumId, curriculum.id),
        eq(tables.nodes.nodeType, "main")
      )
    )
    .orderBy(asc(tables.units.position), asc(tables.nodes.position))
    .all();

  const jobIds = rows
    .filter((r) => r.lessonStatus !== "ready")
    .map((r) => createJob("lesson", r.nodeId));
  if (jobIds.length === 0) return 0;

  void (async () => {
    for (const id of jobIds) {
      await runJob(id); // no-op for deduped ids already run elsewhere
    }
  })();
  return jobIds.length;
}

export function getJob(id: string) {
  return db.query.generationJobs
    .findFirst({ where: eq(tables.generationJobs.id, id) })
    .sync();
}

export async function runJob(jobId: string) {
  const job = getJob(jobId);
  if (!job || job.status !== "queued") return;

  db.update(tables.generationJobs)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(tables.generationJobs.id, jobId))
    .run();

  try {
    if (job.jobType === "curriculum") {
      // Legacy shim: an old "curriculum" job = generate the first chapter
      // of the profile's level scheme (N5 for ja, HSK1 for zh, A1 CEFR...).
      await runChapterJob(job.refId, null);
    } else if (job.jobType === "chapter") {
      // refId encodes "profileId:level". Level validity is checked inside
      // runChapterJob against the profile's own scheme.
      const sep = job.refId.lastIndexOf(":");
      const profileId = job.refId.slice(0, sep);
      const level = job.refId.slice(sep + 1);
      await runChapterJob(profileId, level);
    } else if (job.jobType === "lesson") {
      await runLessonJob(job.refId);
    } else if (job.jobType === "grammar") {
      await runGrammarJob(job.refId);
    } else if (job.jobType === "kanji") {
      await runKanjiJob(job.refId);
    } else if (job.jobType === "vocab") {
      await runVocabJob(job.refId);
    } else {
      throw new Error(`Bilinmeyen job tipi: ${job.jobType}`);
    }
    // Cancel check (T-034): the CLI child can't be killed, so a job cancelled
    // mid-run still finished its LLM call and wrote content above — but if the
    // user hit cancel while it ran, respect that verdict and don't overwrite
    // the "cancelled" status with "done". The sequential batch driver stops on
    // its own: the remaining queued rows were deleted by cancelAllJobs/cancelJob
    // and runJob no-ops on them via the status guard at the top.
    const afterRun = getJob(jobId);
    if (afterRun?.status === "cancelled") return;
    db.update(tables.generationJobs)
      .set({ status: "done", finishedAt: new Date() })
      .where(eq(tables.generationJobs.id, jobId))
      .run();
  } catch (err) {
    const raw = err instanceof LlmError ? err.rawOutput : undefined;
    db.update(tables.generationJobs)
      .set({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
        rawOutput: raw?.slice(0, 20_000),
        finishedAt: new Date(),
      })
      .where(eq(tables.generationJobs.id, jobId))
      .run();
    console.error(`[job ${jobId}] failed:`, err);
  }
}

async function runLessonJob(nodeId: string) {
  const feedback = pendingRegenerationFeedback.get(nodeId) ?? null;
  pendingRegenerationFeedback.delete(nodeId);
  await generateLessonContent(db, getProvider(), nodeId, feedback);
}

async function runGrammarJob(topicId: string) {
  await generateGrammarContent(db, getProvider(), topicId);
}

async function runKanjiJob(entryId: string) {
  await generateKanjiContent(db, getProvider(), entryId);
}

async function runVocabJob(entryId: string) {
  await generateVocabContent(db, getProvider(), entryId);
}

/**
 * Walks the prereqNodeId chain from the head (prereqNodeId === null) to the
 * tail (a main node no other main node points at). Returns the tail node id,
 * or null if the curriculum has no main nodes yet. Using the actual chain
 * (not a position sort) is the correct way to find the append target.
 */
async function runChapterJob(profileId: string, levelArg: string | null) {
  await generateChapter(db, getProvider(), profileId, levelArg, {
    modelUsed: process.env.LLM_PROVIDER === "fixture" ? "fixture" : "deep",
  });
}

export function ensureChaptersBackfilled() {
  coreEnsureChaptersBackfilled(db);
}

/** Exposed for the extend/complete routes to find the current top level. */
export function topChapterLevel(curriculumId: string, targetLanguage: string) {
  return coreTopChapterLevel(db, curriculumId, targetLanguage);
}

// ---------------------------------------------------------------- T-034 shells
// Thin server bindings over the env-agnostic core (src/core/jobs.ts). Routes
// call these; the browser (static) path calls the core directly via client-api.

/** Snapshot for the pop + panel (GET /api/jobs). No LLM. */
export function listJobs(historyLimit?: number) {
  return coreListJobs(db, historyLimit);
}

/** Cancel one job (POST /api/jobs/[id]/cancel). */
export function cancelJob(jobId: string) {
  return coreCancelJob(db, jobId);
}

/** Bulk cancel (POST /api/jobs/cancel-all); user batches only by default. */
export function cancelAllJobs(opts?: { userOnly?: boolean }) {
  return coreCancelAllJobs(db, opts);
}

/**
 * Resume boot-recovered `pending_approval` jobs (POST /api/jobs/resume-pending).
 * Core flips them back to `queued`; here we drive them sequentially, exactly
 * like every other bulk loop, so the stale sweep doesn't kill the tail.
 */
export function resumePendingJobs(): number {
  const ids = coreResumePendingJobs(db);
  if (ids.length > 0) {
    void (async () => {
      for (const id of ids) {
        await runJob(id); // no-op if already picked up / re-cancelled
      }
    })();
  }
  return ids.length;
}
