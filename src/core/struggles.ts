import { and, asc, desc, eq, gte, lt, or } from "drizzle-orm";
import * as tables from "@/db/schema";
import type { AppDb } from "./db-types";

/**
 * Compact "what the learner struggles with" signal for lesson generation.
 * Two sources, both capped small so the prompt stays lean:
 *  - SRS cards repeatedly failed (lapses >= 2) or chronically hard (ease < 2.0)
 *  - Lesson topics where recent exercise attempts scored poorly
 * Returns a single prompt-ready Turkish line, or null when there's no signal.
 */
export function getStrugglesLine(db: AppDb, profileId: string): string | null {
  const weakCards = db
    .select()
    .from(tables.srsCards)
    .where(
      and(
        eq(tables.srsCards.profileId, profileId),
        or(gte(tables.srsCards.lapses, 2), lt(tables.srsCards.easeFactor, 2.0))
      )
    )
    .orderBy(desc(tables.srsCards.lapses), asc(tables.srsCards.easeFactor))
    .limit(6)
    .all()
    .map((c) => c.front);

  // Topic-level signal from exercise attempts. Only the LATEST attempt per
  // exercise counts: earlier failures the learner subsequently corrected are
  // progress, not struggle (and grading hiccups would otherwise poison the
  // signal permanently). Scoped to this profile's curriculum.
  const recent = db
    .select({
      exerciseId: tables.attempts.exerciseId,
      isCorrect: tables.attempts.isCorrect,
      score: tables.attempts.score,
      title: tables.nodes.titleTr,
      profileId: tables.curricula.profileId,
      createdAt: tables.attempts.createdAt,
    })
    .from(tables.attempts)
    .innerJoin(
      tables.exercises,
      eq(tables.attempts.exerciseId, tables.exercises.id)
    )
    .innerJoin(tables.lessons, eq(tables.exercises.lessonId, tables.lessons.id))
    .innerJoin(tables.nodes, eq(tables.lessons.nodeId, tables.nodes.id))
    .innerJoin(tables.units, eq(tables.nodes.unitId, tables.units.id))
    .innerJoin(
      tables.curricula,
      eq(tables.units.curriculumId, tables.curricula.id)
    )
    .where(eq(tables.curricula.profileId, profileId))
    .orderBy(desc(tables.attempts.createdAt))
    .limit(200)
    .all();

  const latestPerExercise = new Map<
    string,
    { isCorrect: boolean | null; score: number | null; title: string }
  >();
  for (const a of recent) {
    if (a.profileId !== profileId) continue;
    if (!latestPerExercise.has(a.exerciseId)) {
      latestPerExercise.set(a.exerciseId, a);
    }
  }
  const weakTopics = [
    ...new Set(
      [...latestPerExercise.values()]
        .filter(
          (a) =>
            a.isCorrect === false || (a.score !== null && a.score < 60)
        )
        .map((a) => a.title)
    ),
  ].slice(0, 4);

  if (weakCards.length === 0 && weakTopics.length === 0) return null;

  const parts: string[] = [];
  if (weakCards.length)
    parts.push(`kelimeler/öğeler: ${weakCards.join(", ")}`);
  if (weakTopics.length) parts.push(`konular: ${weakTopics.join(", ")}`);
  return parts.join(" | ");
}
