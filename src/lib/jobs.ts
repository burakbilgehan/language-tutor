import { and, asc, desc, eq, inArray, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, tables } from "@/db";
import { getProvider, LlmError } from "@/lib/llm/provider";
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
  // Adopt orphan queued jobs: their driving loop may have died with an old
  // process. Driven sequentially, like every bulk loop.
  const orphans = db.query.generationJobs
    .findMany({
      where: and(
        eq(tables.generationJobs.status, "queued"),
        lt(tables.generationJobs.createdAt, PROCESS_START)
      ),
      columns: { id: true },
      orderBy: [asc(tables.generationJobs.createdAt)],
    })
    .sync();
  if (orphans.length > 0) {
    void (async () => {
      for (const o of orphans) {
        await runJob(o.id); // no-op if another process picked it up
      }
    })();
  }

  // Resources stuck 'generating' with no live job → 'error' (retryable in UI).
  const live = db.query.generationJobs
    .findMany({
      where: inArray(tables.generationJobs.status, ["queued", "running"]),
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

  const jobId = createJob("lesson", nodeId);
  void runJob(jobId); // no-op if the returned job is already running
  return jobId;
}

/**
 * Force a fresh generation for a node whose lesson may already be ready —
 * lets stale/low-quality cached lessons be rebuilt under the current prompt.
 * The lesson row is flipped to "generating" up front so an open() racing the
 * queued job doesn't serve the stale copy.
 */
export function regenerateLessonJob(nodeId: string): string {
  const lesson = db.query.lessons
    .findFirst({ where: eq(tables.lessons.nodeId, nodeId) })
    .sync();
  if (lesson) {
    db.update(tables.lessons)
      .set({ status: "generating" })
      .where(eq(tables.lessons.id, lesson.id))
      .run();
  }
  const jobId = createJob("lesson", nodeId);
  void runJob(jobId);
  return jobId;
}

/**
 * Fire lesson generation for the node(s) whose prereq is `nodeId`. Called when
 * a lesson is OPENED, so the successor generates while the learner works
 * through the current one (~minutes of head start) instead of only in the
 * completion→open gap. No extra LLM spend: the successor's lesson would be
 * generated anyway; this only moves it earlier. Errored lessons are skipped —
 * retries stay user-driven (opening the node itself), not poll-driven.
 */
export function prefetchSuccessorLessons(nodeId: string) {
  const successors = db.query.nodes
    .findMany({
      where: and(
        eq(tables.nodes.prereqNodeId, nodeId),
        eq(tables.nodes.nodeType, "main")
      ),
      columns: { id: true },
    })
    .sync();
  for (const s of successors) {
    const lesson = db.query.lessons
      .findFirst({ where: eq(tables.lessons.nodeId, s.id) })
      .sync();
    if (lesson?.status === "error") continue;
    ensureLessonJob(s.id);
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
    } else {
      throw new Error(`Bilinmeyen job tipi: ${job.jobType}`);
    }
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
  const node = db.query.nodes
    .findFirst({ where: eq(tables.nodes.id, nodeId) })
    .sync();
  if (!node) throw new Error("Node bulunamadı");

  const unit = db.query.units
    .findFirst({ where: eq(tables.units.id, node.unitId) })
    .sync();
  if (!unit) throw new Error("Ünite bulunamadı");

  const curriculum = db.query.curricula
    .findFirst({ where: eq(tables.curricula.id, unit.curriculumId) })
    .sync();
  const profile = db.query.profiles
    .findFirst({ where: eq(tables.profiles.id, curriculum!.profileId) })
    .sync();
  if (!profile) throw new Error("Profil bulunamadı");

  const completedTitles = db
    .select({ title: tables.nodes.titleTr })
    .from(tables.nodes)
    .where(eq(tables.nodes.status, "completed"))
    .all()
    .map((r) => r.title)
    .slice(-12);

  // Recent exercise questions in this curriculum — fed to the prompt so the
  // LLM stops recycling the same trivially-patterned questions across lessons.
  const recentExercisePrompts = db
    .select({ prompt: tables.exercises.promptTr })
    .from(tables.exercises)
    .innerJoin(
      tables.lessons,
      eq(tables.exercises.lessonId, tables.lessons.id)
    )
    .innerJoin(tables.nodes, eq(tables.lessons.nodeId, tables.nodes.id))
    .innerJoin(tables.units, eq(tables.nodes.unitId, tables.units.id))
    .where(eq(tables.units.curriculumId, unit.curriculumId))
    .all()
    .map((r) => r.prompt)
    .slice(-30);

  // Ensure a lessons row exists (status marker for the UI).
  const existing = db.query.lessons
    .findFirst({ where: eq(tables.lessons.nodeId, nodeId) })
    .sync();
  const lessonId = existing?.id ?? nanoid();
  if (!existing) {
    db.insert(tables.lessons)
      .values({ id: lessonId, nodeId, status: "generating" })
      .run();
  } else {
    db.update(tables.lessons)
      .set({ status: "generating" })
      .where(eq(tables.lessons.id, lessonId))
      .run();
  }

  try {
    const { system, prompt } = lessonPrompt({
      profile,
      node,
      unitTitle: unit.titleTr,
      unitTheme: unit.theme,
      completedTitles,
      strugglesLine: getStrugglesLine(profile.id),
      recentExercisePrompts,
    });
    const lesson = await getProvider().generateJson({
      system,
      prompt,
      schema: LessonSchema,
      fixtureKey: "lesson",
      tier: "balanced",
      timeoutMs: 300_000,
    });

    db.transaction((tx) => {
      tx.update(tables.lessons)
        .set({ content: lesson, status: "ready", generatedAt: new Date() })
        .where(eq(tables.lessons.id, lessonId))
        .run();
      // Re-generation: replace old exercises. Attempts on the replaced
      // exercises go with them (FK, and they grade questions that no longer
      // exist).
      tx.delete(tables.attempts)
        .where(
          inArray(
            tables.attempts.exerciseId,
            tx
              .select({ id: tables.exercises.id })
              .from(tables.exercises)
              .where(eq(tables.exercises.lessonId, lessonId))
          )
        )
        .run();
      tx.delete(tables.exercises)
        .where(eq(tables.exercises.lessonId, lessonId))
        .run();
      lesson.exercises.forEach((ex, i) => {
        tx.insert(tables.exercises)
          .values({
            id: nanoid(),
            lessonId,
            position: i,
            type: ex.type,
            promptTr: ex.prompt_tr,
            targetText: ex.target_text ?? null,
            options: ex.options ?? null,
            answer: ex.answer,
            acceptAlso: ex.accept_also ?? null,
            grading:
              ex.type === "free_response" || ex.type === "translate"
                ? "llm"
                : "deterministic",
          })
          .run();
      });
    });
  } catch (err) {
    db.update(tables.lessons)
      .set({ status: "error" })
      .where(eq(tables.lessons.id, lessonId))
      .run();
    throw err;
  }
}

async function runGrammarJob(topicId: string) {
  const topic = db.query.grammarTopics
    .findFirst({ where: eq(tables.grammarTopics.id, topicId) })
    .sync();
  if (!topic) throw new Error("Gramer konusu bulunamadı");

  // Level personalization must follow the topic's language, not whichever
  // profile happens to be active when the job runs.
  const profile = db.query.profiles
    .findFirst({
      where: eq(tables.profiles.targetLanguage, topic.targetLanguage),
    })
    .sync();
  const siblingTitles = db
    .select({ title: tables.grammarTopics.titleTr })
    .from(tables.grammarTopics)
    .where(eq(tables.grammarTopics.targetLanguage, topic.targetLanguage))
    .all()
    .map((r) => r.title);

  db.update(tables.grammarTopics)
    .set({ status: "generating" })
    .where(eq(tables.grammarTopics.id, topicId))
    .run();

  try {
    const { system, prompt } = grammarPrompt({
      topic,
      selfLevel: profile?.selfLevel ?? "zero",
      nativeLanguage: profile?.nativeLanguage ?? "tr",
      siblingTitles,
    });
    const content = await getProvider().generateJson({
      system,
      prompt,
      schema: GrammarTopicSchema,
      fixtureKey: "grammar",
      tier: "balanced",
      timeoutMs: 300_000,
    });
    db.update(tables.grammarTopics)
      .set({ content, status: "ready", generatedAt: new Date() })
      .where(eq(tables.grammarTopics.id, topicId))
      .run();
  } catch (err) {
    db.update(tables.grammarTopics)
      .set({ status: "error" })
      .where(eq(tables.grammarTopics.id, topicId))
      .run();
    throw err;
  }
}

async function runKanjiJob(entryId: string) {
  const entry = db.query.kanjiEntries
    .findFirst({ where: eq(tables.kanjiEntries.id, entryId) })
    .sync();
  if (!entry) throw new Error("Kanji kaydı bulunamadı");

  // Personalization follows the entry's language, not the active profile.
  const profile = db.query.profiles
    .findFirst({
      where: eq(tables.profiles.targetLanguage, entry.targetLanguage),
    })
    .sync();

  db.update(tables.kanjiEntries)
    .set({ status: "generating" })
    .where(eq(tables.kanjiEntries.id, entryId))
    .run();

  try {
    const { system, prompt } = kanjiPrompt({
      entry,
      selfLevel: profile?.selfLevel ?? "zero",
      interests: profile?.interests ?? [],
      nativeLanguage: profile?.nativeLanguage,
    });
    const content = await getProvider().generateJson({
      system,
      prompt,
      schema: KanjiContentSchema,
      fixtureKey: "kanji",
      tier: "fast",
      timeoutMs: 120_000,
    });
    db.update(tables.kanjiEntries)
      .set({ content, status: "ready", generatedAt: new Date() })
      .where(eq(tables.kanjiEntries.id, entryId))
      .run();
  } catch (err) {
    db.update(tables.kanjiEntries)
      .set({ status: "error" })
      .where(eq(tables.kanjiEntries.id, entryId))
      .run();
    throw err;
  }
}

/**
 * Walks the prereqNodeId chain from the head (prereqNodeId === null) to the
 * tail (a main node no other main node points at). Returns the tail node id,
 * or null if the curriculum has no main nodes yet. Using the actual chain
 * (not a position sort) is the correct way to find the append target.
 */
function findChainTail(curriculumId: string): string | null {
  const unitIds = db
    .select({ id: tables.units.id })
    .from(tables.units)
    .where(eq(tables.units.curriculumId, curriculumId))
    .all()
    .map((u) => u.id);
  if (unitIds.length === 0) return null;

  const mains = db.query.nodes
    .findMany({ where: eq(tables.nodes.nodeType, "main") })
    .sync()
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
function topChapterLevel(
  curriculumId: string,
  targetLanguage: string
): string | null {
  const chapters = db.query.curriculumChapters
    .findMany({
      where: eq(tables.curriculumChapters.curriculumId, curriculumId),
      orderBy: [desc(tables.curriculumChapters.position)],
    })
    .sync();
  return chapters.find((c) => isLevelOf(targetLanguage, c.level))?.level ?? null;
}

/**
 * Backfill: an existing pre-chapters curriculum (units with chapterId=null)
 * gets a single "N4" chapter row (the old ceiling) so extend logic knows where
 * it stands. Also remaps legacy JLPT level strings stored for non-Japanese
 * curricula (pre-scheme era faked "N5"≈A1) onto the language's real scheme.
 * Idempotent — safe to call repeatedly.
 */
export function ensureChaptersBackfilled() {
  ensureLevelSchemeMigrated();
  // drizzle eq(col, null) doesn't emit IS NULL; scan and filter in JS instead.
  const units = db.query.units.findMany().sync();
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
    const existing = db.query.curriculumChapters
      .findFirst({
        where: eq(tables.curriculumChapters.curriculumId, curriculumId),
      })
      .sync();
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

/**
 * Legacy self-heal: non-Japanese curricula created before per-language level
 * schemes stored JLPT strings ("N5"≈A1). Remap chapters + units onto the
 * language's real scheme by ordinal. No-op once everything is valid.
 */
function ensureLevelSchemeMigrated() {
  const curricula = db.query.curricula.findMany().sync();
  for (const cur of curricula) {
    const profile = db.query.profiles
      .findFirst({ where: eq(tables.profiles.id, cur.profileId) })
      .sync();
    if (!profile || schemeFor(profile.targetLanguage).name === "JLPT") continue;

    const chapters = db.query.curriculumChapters
      .findMany({ where: eq(tables.curriculumChapters.curriculumId, cur.id) })
      .sync();
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

/** Compact summary of already-taught units + covered grammar for the prompt. */
function buildPriorSummary(
  curriculumId: string,
  targetLanguage: string,
  level: string
): string {
  const units = db.query.units
    .findMany({
      where: eq(tables.units.curriculumId, curriculumId),
      orderBy: [asc(tables.units.position)],
    })
    .sync();
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
 * prereq chain. `level: null` means the scheme's first level (legacy jobs).
 */
async function runChapterJob(profileId: string, levelArg: string | null) {
  const profile = db.query.profiles.findFirst({
    where: eq(tables.profiles.id, profileId),
  }).sync();
  if (!profile) throw new Error("Profil bulunamadı");

  const level = levelArg ?? schemeFor(profile.targetLanguage).levels[0];
  if (!isLevelOf(profile.targetLanguage, level)) {
    throw new Error(`Geçersiz seviye: ${level}`);
  }

  ensureChaptersBackfilled();

  // Resolve (or create) the profile's single curriculum.
  const curriculum = db.query.curricula
    .findFirst({ where: eq(tables.curricula.profileId, profileId) })
    .sync();
  const isFirst = !curriculum;
  const curriculumId = curriculum?.id ?? nanoid();
  if (!curriculum) {
    db.insert(tables.curricula)
      .values({ id: curriculumId, profileId, status: "generating" })
      .run();
  }

  // Concurrency guard: upsert the chapter row; abort if already done/in-flight.
  const existingChapter = db.query.curriculumChapters
    .findFirst({
      where: and(
        eq(tables.curriculumChapters.curriculumId, curriculumId),
        eq(tables.curriculumChapters.level, level)
      ),
    })
    .sync();
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
    : buildPriorSummary(curriculumId, profile.targetLanguage, level);

  const { system, prompt } = chapterPrompt({ profile, level, priorSummary });

  try {
    const chapter = await getProvider().generateJson({
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
    const chainTail = findChainTail(curriculumId);
    const hasSideQuests =
      db.query.nodes
        .findFirst({ where: eq(tables.nodes.nodeType, "side_quest") })
        .sync() != null;

    db.transaction((tx) => {
      if (isFirst) {
        tx.update(tables.curricula)
          .set({
            title: chapter.title,
            status: "ready",
            modelUsed:
              process.env.LLM_PROVIDER === "fixture" ? "fixture" : "deep",
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

/** Exposed for the extend/complete routes to find the current top level. */
export { topChapterLevel };
