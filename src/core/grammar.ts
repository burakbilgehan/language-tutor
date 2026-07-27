import { and, asc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as tables from "@/db/schema";
import { grammarIndexFor, titleFor } from "@/lib/grammar-index";
import type { GrammarTopicContent } from "@/lib/llm/schemas";
import {
  mergeLangContent,
  readLangContent,
  type NativeLang,
} from "@/lib/llm/lang-content";
import type { AppDb } from "./db-types";

// Gramer cheatsheet'inin ortam-bağımsız okuma yüzeyi. Konu İÇERİĞİ üretimi
// (LLM) sunucu job'unda / gelecekte tarayıcı LLM katmanında; burada yalnız
// deterministik index senkronu + okuma var.

/**
 * Self-healing: incrementally sync the deterministic cheatsheet index.
 * Missing slugs are inserted (status "pending"); existing rows get their
 * position/title/category/level re-synced so index reordering and growth
 * reach existing profiles too. Generated content (content/status/generatedAt)
 * is NEVER touched.
 */
export function ensureSeeded(db: AppDb, targetLanguage: string) {
  const existing = db
    .select({ id: tables.grammarTopics.id, slug: tables.grammarTopics.slug })
    .from(tables.grammarTopics)
    .where(eq(tables.grammarTopics.targetLanguage, targetLanguage))
    .all();
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

/**
 * Fill still-empty topics from a packaged seed file. Only rows with status
 * pending/error are touched — user-generated content always wins (LLM output
 * is never overwritten by any seed layer, regardless of `seedLang`).
 *
 * `seedLang` is the language THE SEED FILE ITSELF is written in, which is NOT
 * necessarily the caller's `nativeLanguage` — it always is for the two seed
 * layers actually in use (T-064):
 *   - public/grammar-seed/<target>.json        → tr  (scripts/export-grammar-seed.ts,
 *     exported from the owner's tr-native DB)
 *   - public/grammar-seed/<target>.<lang>.json  → <lang>  (scripts/mt-grammar-seed.ts,
 *     build-time machine translation of the tr seed, content stamped source:"mt")
 * A mismatch (e.g. handing the tr file to an en-native profile) is refused —
 * that was the T-031 bug this function used to hardcode a fix for; genericizing
 * the language instead of dropping the check keeps the fix intact for both
 * layers. Returns how many topics were filled.
 */
export function applyGrammarSeed(
  db: AppDb,
  targetLanguage: string,
  seed: Record<string, GrammarTopicContent>,
  nativeLanguage: NativeLang = "tr",
  seedLang: NativeLang = "tr"
): number {
  if (seedLang !== nativeLanguage) return 0;
  const empty = db
    .select({
      id: tables.grammarTopics.id,
      slug: tables.grammarTopics.slug,
      content: tables.grammarTopics.content,
    })
    .from(tables.grammarTopics)
    .where(
      and(
        eq(tables.grammarTopics.targetLanguage, targetLanguage),
        inArray(tables.grammarTopics.status, ["pending", "error"])
      )
    )
    .all();
  let filled = 0;
  for (const row of empty) {
    const content = seed[row.slug];
    if (!content) continue;
    // Merge, don't replace: an error/pending row may already hold the OTHER
    // language's content (interrupted generation). Wholesale {lang: content}
    // would wipe it permanently (T-031).
    db.update(tables.grammarTopics)
      .set({
        content: mergeLangContent(row.content, seedLang, content),
        status: "ready",
        generatedAt: new Date(),
      })
      .where(eq(tables.grammarTopics.id, row.id))
      .run();
    filled++;
  }
  return filled;
}

export function listGrammarTopics(
  db: AppDb,
  targetLanguage: string,
  nativeLanguage: NativeLang = "tr"
) {
  ensureSeeded(db, targetLanguage);
  return db
    .select()
    .from(tables.grammarTopics)
    .where(eq(tables.grammarTopics.targetLanguage, targetLanguage))
    .orderBy(asc(tables.grammarTopics.position))
    .all()
    .map((t) => ({
      slug: t.slug,
      // T-064: display title in the profile's native language when a
      // committed translation exists (src/lib/grammar-index titles.*.json);
      // falls back to the tr titleTr column otherwise. Field name kept as
      // `titleTr` (no shape change) — see the _tr naming convention note in
      // CLAUDE.md, it means "learner-facing title", not literally Turkish.
      titleTr: titleFor(targetLanguage, t.slug, t.titleTr, nativeLanguage),
      category: t.category,
      level: t.level,
      // Effective status: a row whose content isn't in the current native
      // language reads as pending so the UI offers "Hazırla" (T-031).
      status:
        t.status === "ready" &&
        !readLangContent<GrammarTopicContent>(t.content, nativeLanguage)
          ? ("pending" as const)
          : t.status,
    }));
}

export function findGrammarTopic(
  db: AppDb,
  targetLanguage: string,
  slug: string
) {
  return (
    db
      .select()
      .from(tables.grammarTopics)
      .where(
        and(
          eq(tables.grammarTopics.targetLanguage, targetLanguage),
          eq(tables.grammarTopics.slug, slug)
        )
      )
      .limit(1)
      .get() ?? null
  );
}
