import { and, eq, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, tables } from "@/db";
import { getProvider, LlmError } from "@/lib/llm/provider";
import { CurriculumSchema } from "@/lib/llm/schemas";
import { curriculumPrompt } from "@/lib/llm/prompts/curriculum";

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

      curriculum.grammar_index.forEach((g, i) => {
        tx.insert(tables.grammarTopics)
          .values({
            id: nanoid(),
            targetLanguage: profile.targetLanguage,
            slug: g.slug,
            titleTr: g.title_tr,
            category: g.category,
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
