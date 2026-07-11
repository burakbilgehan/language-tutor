import { and, asc, desc, eq, inArray, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, tables } from "@/db";
import { getProvider, LlmError } from "@/lib/llm/provider";
import {
  CurriculumSchema,
  GrammarTopicSchema,
  LessonSchema,
} from "@/lib/llm/schemas";
import { chapterPrompt } from "@/lib/llm/prompts/curriculum";
import { lessonPrompt } from "@/lib/llm/prompts/lesson";
import { grammarPrompt } from "@/lib/llm/prompts/grammar";
import { grammarIndexFor } from "@/lib/grammar-index";
import { getStrugglesLine } from "@/lib/struggles";
import {
  levelOrdinal,
  isJlptLevel,
  type JlptLevel,
} from "@/lib/curriculum/levels";

type JobType = (typeof tables.generationJobs.$inferSelect)["jobType"];

const STALE_MS = 15 * 60 * 1000;
let staleCheckDone = false;

/** Jobs left 'running' by a dead dev-server process → error, so UI can retry. */
export function recoverStaleJobs() {
  if (staleCheckDone) return;
  staleCheckDone = true;
  db.update(tables.generationJobs)
    .set({
      status: "error",
      error: "Sunucu yeniden başladı, üretim yarıda kaldı.",
      finishedAt: new Date(),
    })
    .where(
      and(
        eq(tables.generationJobs.status, "running"),
        lt(tables.generationJobs.startedAt, new Date(Date.now() - STALE_MS))
      )
    )
    .run();
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
      // Legacy shim: an old "curriculum" job = generate the N5 chapter.
      await runChapterJob(job.refId, "N5");
    } else if (job.jobType === "chapter") {
      // refId encodes "profileId:level".
      const sep = job.refId.lastIndexOf(":");
      const profileId = job.refId.slice(0, sep);
      const level = job.refId.slice(sep + 1);
      if (!isJlptLevel(level)) throw new Error(`Geçersiz seviye: ${level}`);
      await runChapterJob(profileId, level);
    } else if (job.jobType === "lesson") {
      await runLessonJob(job.refId);
    } else if (job.jobType === "grammar") {
      await runGrammarJob(job.refId);
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
      // Re-generation: replace old exercises.
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

  const profile = db.query.profiles.findFirst().sync();
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

/** Highest JLPT level already present as a chapter, or null. */
function topChapterLevel(curriculumId: string): JlptLevel | null {
  const chapters = db.query.curriculumChapters
    .findMany({
      where: eq(tables.curriculumChapters.curriculumId, curriculumId),
      orderBy: [desc(tables.curriculumChapters.position)],
    })
    .sync();
  const top = chapters.find((c) => isJlptLevel(c.level));
  return top && isJlptLevel(top.level) ? top.level : null;
}

/**
 * Backfill: an existing pre-chapters curriculum (units with chapterId=null)
 * gets a single "N4" chapter row (the old ceiling) so extend logic knows where
 * it stands. Idempotent — safe to call repeatedly.
 */
export function ensureChaptersBackfilled() {
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

/** Compact summary of already-taught units + covered grammar for the prompt. */
function buildPriorSummary(
  curriculumId: string,
  targetLanguage: string,
  level: JlptLevel
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
  const targetOrd = levelOrdinal(level);
  const coveredGrammar = grammarIndexFor(targetLanguage)
    .filter((g) => isJlptLevel(g.level) && levelOrdinal(g.level) < targetOrd)
    .map((g) => g.title_tr);
  const grammarLine =
    coveredGrammar.length > 0
      ? `\nKapsanan dilbilgisi (özet): ${coveredGrammar.slice(0, 60).join(", ")}`
      : "";

  return `Önceki üniteler:\n${unitLines}${grammarLine}`;
}

/**
 * Generates ONE JLPT chapter for a profile and appends it to the profile's
 * single curriculum. First chapter (N5) creates the curriculum + side quests;
 * later chapters stitch onto the existing prereq chain.
 */
async function runChapterJob(profileId: string, level: JlptLevel) {
  const profile = db.query.profiles.findFirst({
    where: eq(tables.profiles.id, profileId),
  }).sync();
  if (!profile) throw new Error("Profil bulunamadı");

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
        position: levelOrdinal(level),
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
