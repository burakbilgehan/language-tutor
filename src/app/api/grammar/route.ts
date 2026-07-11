import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, tables } from "@/db";
import { grammarIndexFor } from "@/lib/grammar-index";

export const runtime = "nodejs";

/**
 * Self-healing: incrementally sync the deterministic cheatsheet index.
 * Missing slugs are inserted (status "pending"); existing rows get their
 * position/title/category/level re-synced so index reordering and growth
 * reach existing profiles too. Generated content (content/status/generatedAt)
 * is NEVER touched.
 */
function ensureSeeded(targetLanguage: string) {
  const existing = db.query.grammarTopics
    .findMany({
      where: eq(tables.grammarTopics.targetLanguage, targetLanguage),
      columns: { id: true, slug: true },
    })
    .sync();
  const bySlug = new Map(existing.map((t) => [t.slug, t.id]));

  grammarIndexFor(targetLanguage).forEach((g, i) => {
    const id = bySlug.get(g.slug);
    if (id) {
      db.update(tables.grammarTopics)
        .set({
          position: i,
          titleTr: g.title_tr,
          category: g.category,
          level: g.level,
        })
        .where(eq(tables.grammarTopics.id, id))
        .run();
    } else {
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
    }
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
