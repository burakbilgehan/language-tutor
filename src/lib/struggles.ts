import { and, asc, desc, eq, gte, lt, or } from "drizzle-orm";
import { db, tables } from "@/db";

/**
 * Compact "what the learner struggles with" signal for lesson generation.
 * Two sources, both capped small so the prompt stays lean:
 *  - SRS cards repeatedly failed (lapses >= 2) or chronically hard (ease < 2.0)
 *  - Lesson topics where recent exercise attempts scored poorly
 * Returns a single prompt-ready Turkish line, or null when there's no signal.
 */
export function getStrugglesLine(profileId: string): string | null {
  const weakCards = db.query.srsCards
    .findMany({
      where: and(
        eq(tables.srsCards.profileId, profileId),
        or(
          gte(tables.srsCards.lapses, 2),
          lt(tables.srsCards.easeFactor, 2.0)
        )
      ),
      orderBy: [desc(tables.srsCards.lapses), asc(tables.srsCards.easeFactor)],
      limit: 6,
    })
    .sync()
    .map((c) => c.front);

  // Failed/low-score attempts → their lesson node titles (topic-level signal).
  const weakTopicRows = db
    .select({ title: tables.nodes.titleTr })
    .from(tables.attempts)
    .innerJoin(
      tables.exercises,
      eq(tables.attempts.exerciseId, tables.exercises.id)
    )
    .innerJoin(tables.lessons, eq(tables.exercises.lessonId, tables.lessons.id))
    .innerJoin(tables.nodes, eq(tables.lessons.nodeId, tables.nodes.id))
    .where(
      or(eq(tables.attempts.isCorrect, false), lt(tables.attempts.score, 60))
    )
    .orderBy(desc(tables.attempts.createdAt))
    .limit(30)
    .all();
  const weakTopics = [...new Set(weakTopicRows.map((r) => r.title))].slice(
    0,
    4
  );

  if (weakCards.length === 0 && weakTopics.length === 0) return null;

  const parts: string[] = [];
  if (weakCards.length)
    parts.push(`kelimeler/öğeler: ${weakCards.join(", ")}`);
  if (weakTopics.length) parts.push(`konular: ${weakTopics.join(", ")}`);
  return parts.join(" | ");
}
