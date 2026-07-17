import { NextResponse } from "next/server";
import { getActiveProfile } from "@/lib/profile";
import { db } from "@/db";
import { getStrugglesLine } from "@/lib/struggles";
import { levelDisplay, nextLevelFor } from "@/lib/curriculum/levels";

export const runtime = "nodejs";

/**
 * Deterministic learning overview for the floating panel: progress, pace,
 * a naive-but-honest projection, recent scores, SRS health and the struggle
 * line the lesson prompts already use. No LLM — every number is derivable,
 * so the panel is free and always current.
 */
export async function GET() {
  const profile = getActiveProfile();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }
  const sql = db.$client;
  const pid = profile.id;

  const nodeAgg = sql
    .prepare(
      `SELECT
         count(*) total,
         sum(CASE WHEN n.status='completed' THEN 1 ELSE 0 END) completed,
         sum(CASE WHEN n.status='completed' AND n.completed_at > unixepoch('now','-14 days') THEN 1 ELSE 0 END) completed14
       FROM nodes n
       JOIN units u ON n.unit_id = u.id
       JOIN curricula c ON u.curriculum_id = c.id
       WHERE c.profile_id = ? AND n.node_type = 'main'`
    )
    .get(pid) as { total: number; completed: number; completed14: number };

  // Current level = lowest chapter that still has an incomplete node.
  const cur = sql
    .prepare(
      `SELECT ch.level,
              count(*) total,
              sum(CASE WHEN n.status='completed' THEN 1 ELSE 0 END) done
       FROM nodes n
       JOIN units u ON n.unit_id = u.id
       JOIN curriculum_chapters ch ON u.chapter_id = ch.id
       JOIN curricula c ON u.curriculum_id = c.id
       WHERE c.profile_id = ? AND n.node_type='main'
       GROUP BY ch.id ORDER BY ch.position`
    )
    .all(pid) as { level: string; total: number; done: number }[];
  const current = cur.find((r) => r.done < r.total) ?? cur[cur.length - 1] ?? null;

  const attempts = sql
    .prepare(
      `SELECT count(*) n, round(avg(score),0) avgScore
       FROM attempts a
       JOIN exercises e ON a.exercise_id = e.id
       JOIN lessons l ON e.lesson_id = l.id
       JOIN nodes nd ON l.node_id = nd.id
       JOIN units u ON nd.unit_id = u.id
       JOIN curricula c ON u.curriculum_id = c.id
       WHERE c.profile_id = ? AND a.score IS NOT NULL
         AND a.created_at > unixepoch('now','-14 days')`
    )
    .get(pid) as { n: number; avgScore: number | null };

  const srs = sql
    .prepare(
      `SELECT count(*) total,
              sum(CASE WHEN due_at <= unixepoch('now') THEN 1 ELSE 0 END) due,
              sum(CASE WHEN lapses >= 3 THEN 1 ELSE 0 END) leeches
       FROM srs_cards WHERE profile_id = ?`
    )
    .get(pid) as { total: number; due: number; leeches: number };

  const perWeek = nodeAgg.completed14 / 2;
  const remainingInLevel = current ? current.total - current.done : 0;
  const weeksToLevel =
    perWeek > 0 ? Math.ceil(remainingInLevel / perWeek) : null;
  const next = current
    ? nextLevelFor(profile.targetLanguage, current.level)
    : null;

  return NextResponse.json({
    targetLanguage: profile.targetLanguage,
    nodes: nodeAgg,
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
    struggles: getStrugglesLine(pid),
  });
}
