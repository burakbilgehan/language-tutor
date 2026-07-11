import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, tables } from "@/db";
import { grammarIndexFor } from "@/lib/grammar-index";

export const runtime = "nodejs";

/** Self-healing: seed the deterministic cheatsheet index if missing. */
function ensureSeeded(targetLanguage: string) {
  const existing = db.query.grammarTopics
    .findFirst({ where: eq(tables.grammarTopics.targetLanguage, targetLanguage) })
    .sync();
  if (existing) return;
  grammarIndexFor(targetLanguage).forEach((g, i) => {
    db.insert(tables.grammarTopics)
      .values({
        id: nanoid(),
        targetLanguage,
        slug: g.slug,
        titleTr: g.title_tr,
        category: g.category,
        level: g.level,
        position: i,
      })
      .onConflictDoNothing()
      .run();
  });
}

export async function GET() {
  const profile = db.query.profiles.findFirst().sync();
  if (!profile) {
    return NextResponse.json({ error: "Profil yok" }, { status: 404 });
  }
  ensureSeeded(profile.targetLanguage);
  const topics = db.query.grammarTopics
    .findMany({
      where: eq(tables.grammarTopics.targetLanguage, profile.targetLanguage),
      orderBy: [asc(tables.grammarTopics.position)],
    })
    .sync()
    .map((t) => ({
      slug: t.slug,
      titleTr: t.titleTr,
      category: t.category,
      level: t.level,
      status: t.status,
    }));
  return NextResponse.json({ topics });
}
