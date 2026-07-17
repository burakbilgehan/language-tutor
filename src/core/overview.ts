import { sql } from "drizzle-orm";
import { getStrugglesLine } from "./struggles";
import { levelDisplay, nextLevelFor } from "@/lib/curriculum/levels";
import type { AppDb } from "./db-types";

/**
 * Deterministic learning overview for the floating panel: progress, pace,
 * a naive-but-honest projection, recent scores, SRS health and the struggle
 * line the lesson prompts already use. No LLM — every number is derivable.
 * Raw aggregates drizzle'ın sql tag'iyle (better-sqlite3 $client.prepare
 * yerine) — böylece sql.js sürücüsünde de aynen çalışır.
 */
export function getOverview(
  db: AppDb,
  profile: { id: string; targetLanguage: string }
) {
  const pid = profile.id;

  const nodeAgg = db.get<{
    total: number;
    completed: number | null;
    completed14: number | null;
  }>(sql`SELECT
       count(*) total,
       sum(CASE WHEN n.status='completed' THEN 1 ELSE 0 END) completed,
       sum(CASE WHEN n.status='completed' AND n.completed_at > unixepoch('now','-14 days') THEN 1 ELSE 0 END) completed14
     FROM nodes n
     JOIN units u ON n.unit_id = u.id
     JOIN curricula c ON u.curriculum_id = c.id
     WHERE c.profile_id = ${pid} AND n.node_type = 'main'`) ?? {
    total: 0,
    completed: 0,
    completed14: 0,
  };

  // Current level = lowest chapter that still has an incomplete node.
  const cur = db.all<{ level: string; total: number; done: number }>(
    sql`SELECT ch.level,
            count(*) total,
            sum(CASE WHEN n.status='completed' THEN 1 ELSE 0 END) done
     FROM nodes n
     JOIN units u ON n.unit_id = u.id
     JOIN curriculum_chapters ch ON u.chapter_id = ch.id
     JOIN curricula c ON u.curriculum_id = c.id
     WHERE c.profile_id = ${pid} AND n.node_type='main'
     GROUP BY ch.id ORDER BY ch.position`
  );
  const current = cur.find((r) => r.done < r.total) ?? cur[cur.length - 1] ?? null;

  const attempts = db.get<{ n: number; avgScore: number | null }>(
    sql`SELECT count(*) n, round(avg(score),0) avgScore
     FROM attempts a
     JOIN exercises e ON a.exercise_id = e.id
     JOIN lessons l ON e.lesson_id = l.id
     JOIN nodes nd ON l.node_id = nd.id
     JOIN units u ON nd.unit_id = u.id
     JOIN curricula c ON u.curriculum_id = c.id
     WHERE c.profile_id = ${pid} AND a.score IS NOT NULL
       AND a.created_at > unixepoch('now','-14 days')`
  ) ?? { n: 0, avgScore: null };

  const srs = db.get<{
    total: number;
    due: number | null;
    leeches: number | null;
  }>(sql`SELECT count(*) total,
            sum(CASE WHEN due_at <= unixepoch('now') THEN 1 ELSE 0 END) due,
            sum(CASE WHEN lapses >= 3 THEN 1 ELSE 0 END) leeches
     FROM srs_cards WHERE profile_id = ${pid}`) ?? {
    total: 0,
    due: 0,
    leeches: 0,
  };

  const completed14 = nodeAgg.completed14 ?? 0;
  const perWeek = completed14 / 2;
  const remainingInLevel = current ? current.total - current.done : 0;
  const weeksToLevel = perWeek > 0 ? Math.ceil(remainingInLevel / perWeek) : null;
  const next = current
    ? nextLevelFor(profile.targetLanguage, current.level)
    : null;

  return {
    targetLanguage: profile.targetLanguage,
    nodes: {
      total: nodeAgg.total,
      completed: nodeAgg.completed ?? 0,
      completed14,
    },
    currentLevel: current
      ? {
          level: current.level,
          display: levelDisplay(profile.targetLanguage, current.level),
          done: current.done,
          total: current.total,
        }
      : null,
    nextLevel: next ? levelDisplay(profile.targetLanguage, next) : null,
    pacePerWeek: Math.round(perWeek * 10) / 10,
    weeksToLevel,
    attempts,
    srs,
    struggles: getStrugglesLine(db, pid),
  };
}
