import { and, eq, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, tables } from "@/db";
import { getProvider, LlmError } from "@/lib/llm/provider";
import {
  CurriculumSchema,
  GrammarTopicSchema,
  LessonSchema,
} from "@/lib/llm/schemas";
import { curriculumPrompt } from "@/lib/llm/prompts/curriculum";
import { lessonPrompt } from "@/lib/llm/prompts/lesson";
import { grammarPrompt } from "@/lib/llm/prompts/grammar";
import { grammarIndexFor } from "@/lib/grammar-index";

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

export function createJob(jobType: JobType, refId: string): string {
  const id = nanoid();
  db.insert(tables.generationJobs)
    .values({ id, jobType, refId, status: "queued" })
    .run();
  return id;
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
      await runCurriculumJob(job.refId);
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

async function runCurriculumJob(profileId: string) {
  const profile = db.query.profiles.findFirst({
    where: eq(tables.profiles.id, profileId),
  }).sync();
  if (!profile) throw new Error("Profil bulunamadı");

  const curriculumId = nanoid();
  db.insert(tables.curricula)
    .values({ id: curriculumId, profileId, status: "generating" })
    .run();

  const { system, prompt } = curriculumPrompt(profile);
  try {
    const curriculum = await getProvider().generateJson({
      system,
      prompt,
      schema: CurriculumSchema,
      fixtureKey: "curriculum",
      tier: "deep",
      timeoutMs: 600_000,
    });

    db.transaction((tx) => {
      tx.update(tables.curricula)
        .set({
          title: curriculum.title,
          status: "ready",
          modelUsed: process.env.LLM_PROVIDER === "fixture" ? "fixture" : "deep",
          generatedAt: new Date(),
        })
        .where(eq(tables.curricula.id, curriculumId))
        .run();

      let prevMainNodeId: string | null = null;
      let firstUnitId: string | null = null;

      curriculum.units.forEach((unit, ui) => {
        const unitId = nanoid();
        firstUnitId ??= unitId;
        tx.insert(tables.units)
          .values({
            id: unitId,
            curriculumId,
            position: ui,
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
              status: prevMainNodeId === null ? "available" : "locked",
              prereqNodeId: prevMainNodeId,
            })
            .run();
          prevMainNodeId = nodeId;
        });
      });

      // Side quests live as always-available nodes on the first unit.
      curriculum.side_quests.forEach((sq, i) => {
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

      // Grammar cheatsheet skeleton: deterministic, language-wide index
      // (content per topic is generated on demand and cached).
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
    });
  } catch (err) {
    db.update(tables.curricula)
      .set({ status: "error" })
      .where(eq(tables.curricula.id, curriculumId))
      .run();
    throw err;
  }
}
