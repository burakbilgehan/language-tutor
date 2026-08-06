import { and, asc, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as tables from "@/db/schema";
import { CurriculumSchema, CurriculumPedagogySchema } from "@/lib/llm/schemas";
import type { CurriculumPedagogy } from "@/lib/llm/schemas";
import { chapterPrompt, chapterPromptParts } from "@/lib/llm/prompts/curriculum";
import type { ChapterPromptParts } from "@/lib/llm/prompts/curriculum";
import { curriculumPedagogyPrompt } from "@/lib/llm/prompts/curriculum-pedagogy";
import { grammarIndexFor } from "@/lib/grammar-index";
import { AppError } from "@/lib/errors";
import {
  isLevelOf,
  levelOrdinal,
  levelOrdinalFor,
  remapLegacyLevel,
  schemeFor,
} from "@/lib/curriculum/levels";
import type { AppDb } from "./db-types";
import type { Gen } from "./llm-gen";

// Müfredat bölümü üretiminin ortam-bağımsız çekirdeği (jobs.ts'ten taşındı).
// Sunucu job'u ve statik moddaki client-api aynı fonksiyonu çağırır.

export function findChainTail(db: AppDb, curriculumId: string): string | null {
  const unitIds = db
    .select({ id: tables.units.id })
    .from(tables.units)
    .where(eq(tables.units.curriculumId, curriculumId))
    .all()
    .map((u) => u.id);
  if (unitIds.length === 0) return null;

  const mains = db
    .select()
    .from(tables.nodes)
    .where(eq(tables.nodes.nodeType, "main"))
    .all()
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

/** Highest level (in the language's own scheme) already present as a chapter. */
export function topChapterLevel(
  db: AppDb,
  curriculumId: string,
  targetLanguage: string
): string | null {
  const chapters = db
    .select()
    .from(tables.curriculumChapters)
    .where(eq(tables.curriculumChapters.curriculumId, curriculumId))
    .orderBy(desc(tables.curriculumChapters.position))
    .all();
  return chapters.find((c) => isLevelOf(targetLanguage, c.level))?.level ?? null;
}

/**
 * Legacy self-heal: non-Japanese curricula created before per-language level
 * schemes stored JLPT strings ("N5"≈A1). Remap chapters + units onto the
 * language's real scheme by ordinal. No-op once everything is valid.
 */
function ensureLevelSchemeMigrated(db: AppDb) {
  const curricula = db.select().from(tables.curricula).all();
  for (const cur of curricula) {
    const profile = db
      .select()
      .from(tables.profiles)
      .where(eq(tables.profiles.id, cur.profileId))
      .limit(1)
      .get();
    if (!profile || schemeFor(profile.targetLanguage).name === "JLPT") continue;

    const chapters = db
      .select()
      .from(tables.curriculumChapters)
      .where(eq(tables.curriculumChapters.curriculumId, cur.id))
      .all();
    for (const ch of chapters) {
      const mapped = remapLegacyLevel(profile.targetLanguage, ch.level);
      if (mapped === ch.level) continue;
      db.transaction((tx) => {
        tx.update(tables.curriculumChapters)
          .set({
            level: mapped,
            position: levelOrdinalFor(profile.targetLanguage, mapped),
            // The auto-title was just the level string; keep custom titles.
            ...(ch.titleTr === ch.level ? { titleTr: mapped } : {}),
          })
          .where(eq(tables.curriculumChapters.id, ch.id))
          .run();
        tx.update(tables.units)
          .set({ level: mapped })
          .where(eq(tables.units.chapterId, ch.id))
          .run();
      });
    }
  }
}

/**
 * Backfill: an existing pre-chapters curriculum (units with chapterId=null)
 * gets a single "N4" chapter row (the old ceiling) so extend logic knows where
 * it stands. Idempotent — safe to call repeatedly.
 */
export function ensureChaptersBackfilled(db: AppDb) {
  ensureLevelSchemeMigrated(db);
  // drizzle eq(col, null) doesn't emit IS NULL; scan and filter in JS instead.
  const units = db.select().from(tables.units).all();
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
    const existing = db
      .select()
      .from(tables.curriculumChapters)
      .where(eq(tables.curriculumChapters.curriculumId, curriculumId))
      .limit(1)
      .get();
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
  db: AppDb,
  curriculumId: string,
  targetLanguage: string,
  level: string
): string {
  const units = db
    .select()
    .from(tables.units)
    .where(eq(tables.units.curriculumId, curriculumId))
    .orderBy(asc(tables.units.position))
    .all();
  if (units.length === 0) return "";

  const unitLines = units
    .map((u) => `• ${u.titleTr}${u.theme ? ` (${u.theme})` : ""}`)
    .join("\n");

  // Grammar slugs at levels strictly below the target level.
  const targetOrd = levelOrdinalFor(targetLanguage, level);
  const coveredGrammar = grammarIndexFor(targetLanguage)
    .filter((g) => {
      const ord = levelOrdinalFor(targetLanguage, g.level);
      return ord >= 0 && ord < targetOrd;
    })
    .map((g) => g.title_tr);
  const grammarLine =
    coveredGrammar.length > 0
      ? `\nKapsanan dilbilgisi (özet): ${coveredGrammar.slice(0, 60).join(", ")}`
      : "";

  return `Önceki üniteler:\n${unitLines}${grammarLine}`;
}

/** What the stored pedagogy body is, and whether its pair stamp still holds. */
export interface StoredPedagogyInfo {
  pedagogy: string;
  /** True when the user wrote or amended this body by hand (T-080). */
  edited: boolean;
  /** True when the stamp no longer matches the profile's current pair. */
  stale: boolean;
  generatedAt: string | null;
}

/**
 * Inspects `profiles.curriculum_pedagogy` without deciding whether to use it.
 * Returns null only for absent/malformed values; a stale body still comes back,
 * flagged, because T-080's UI has to be able to SHOW a stale hand-edited body
 * and offer regeneration as an explicit choice.
 */
export function inspectStoredPedagogy(
  profile: typeof tables.profiles.$inferSelect
): StoredPedagogyInfo | null {
  const stored = profile.curriculumPedagogy as CurriculumPedagogy | null;
  if (!stored || typeof stored.pedagogy !== "string") return null;
  if (!stored.pedagogy.trim()) return null;
  const stale =
    stored.targetLanguage !== profile.targetLanguage ||
    stored.nativeLanguage !== (profile.nativeLanguage ?? "tr");
  return {
    pedagogy: stored.pedagogy,
    edited: stored.edited === true,
    stale,
    generatedAt:
      typeof stored.generatedAt === "string" ? stored.generatedAt : null,
  };
}

/**
 * Reads the stored pedagogy body if it should be REUSED for generation.
 *
 * The pair stamp exists because `nativeLanguage` is editable (PATCH
 * /api/profile) and the whole premise of T-079 is that the prompt is
 * pair-specific: a body written for a Turkish speaker must not be silently
 * reused after a switch to English. Same staleness idea as
 * `curricula.contentLang`.
 *
 * T-080 amends what a stale stamp does, and the distinction is the point:
 *
 * - auto-generated + stale  -> null (regenerate; one deep call, nothing lost)
 * - hand-edited   + stale   -> KEPT (user input is never silently destroyed;
 *                              the UI shows the mismatch and offers an
 *                              explicit regenerate button instead)
 * - either        + fresh   -> kept
 * - absent / malformed      -> null
 *
 * Keeping a stale EDITED body means a chapter can be generated from a prompt
 * written for the previous native language. That is the correct trade: the
 * user typed it, they can see it, and they can replace it in one click. The
 * alternative deletes work the user did without asking.
 */
export function readStoredPedagogy(
  profile: typeof tables.profiles.$inferSelect
): string | null {
  const info = inspectStoredPedagogy(profile);
  if (!info) return null;
  if (info.stale && !info.edited) return null;
  return info.pedagogy;
}

/**
 * T-079 stage 1. Returns the pedagogical body of this profile's curriculum
 * prompt, generating it with the deep tier on first use and persisting it on
 * the profile. Every later chapter (every extend) reuses the stored body, so
 * the meta-call is paid for once per profile, not once per level.
 *
 * Persisting happens IMMEDIATELY on success, before the caller spends the
 * (much longer) chapter call: otherwise a chapter failure would burn a second
 * deep-tier meta-call on every retry.
 *
 * There is deliberately NO hardcoded fallback body. If the meta-call fails the
 * error propagates and the chapter is marked errored: a silent generic
 * fallback would quietly produce exactly the hand-generalized curricula this
 * ticket exists to eliminate.
 */
export async function ensureCurriculumPedagogy(
  db: AppDb,
  gen: Gen,
  profileId: string,
  opts?: { force?: boolean }
): Promise<string> {
  const profile = db
    .select()
    .from(tables.profiles)
    .where(eq(tables.profiles.id, profileId))
    .limit(1)
    .get();
  if (!profile) throw new Error("Profil bulunamadı");

  // `force` is T-080's explicit "rewrite it" action, the only way a stored
  // body (including a hand-edited one) is ever replaced. Generation itself
  // never forces: it reuses whatever readStoredPedagogy hands back.
  const existing = opts?.force ? null : readStoredPedagogy(profile);
  if (existing) return existing;

  const { system, prompt } = curriculumPedagogyPrompt({ profile });
  const result = await gen.generateJson({
    system,
    prompt,
    schema: CurriculumPedagogySchema,
    fixtureKey: "curriculum-pedagogy",
    tier: "deep",
    timeoutMs: 300_000,
    label: `müfredat pedagojisi: ${profile.targetLanguage}/${profile.nativeLanguage ?? "tr"}`,
  });

  const stored: CurriculumPedagogy = {
    pedagogy: result.pedagogy,
    targetLanguage: profile.targetLanguage,
    nativeLanguage: profile.nativeLanguage ?? "tr",
    generatedAt: new Date().toISOString(),
  };
  db.update(tables.profiles)
    .set({ curriculumPedagogy: stored })
    .where(eq(tables.profiles.id, profileId))
    .run();

  return result.pedagogy;
}

/**
 * T-080. The exact prompt that curriculum generation WOULD send, split at the
 * one seam the user may edit. `before`/`after` are the locked data contract;
 * `pedagogy` is the editable body.
 *
 * `level`/`priorSummary` are resolved by the SAME rules `generateChapter`
 * applies to the same argument, so the preview is not an approximation of the
 * real prompt; it is the real prompt.
 */
export interface PedagogyPreview extends ChapterPromptParts {
  /** True when the body currently stored was hand-edited by the user. */
  edited: boolean;
  /** True when the stored body's language-pair stamp no longer matches. */
  stale: boolean;
  /** The level this preview was built for. */
  level: string;
}

/**
 * Mirrors `generateChapter`'s own resolution for the same `levelArg`, so the
 * preview can never show a different chapter than the one that gets generated.
 *
 * Both wired entry points (onboarding's final step, the map hub's generate
 * card) reach generation through `curriculumGenerate`, which passes `null`, so
 * they preview the scheme's first level. The rules are copied here rather than
 * approximated: `null` means the first level UNCONDITIONALLY, exactly as in
 * generateChapter, and NOT "the next level after the highest existing chapter"
 * (that is what extend does, via its own explicit level argument). Getting
 * this wrong would show a preview for a level generation never targets.
 */
function resolvePreviewLevel(
  db: AppDb,
  profile: typeof tables.profiles.$inferSelect,
  levelArg: string | null
): { level: string; priorSummary?: string } {
  const level = levelArg ?? schemeFor(profile.targetLanguage).levels[0];
  const curriculum = db
    .select()
    .from(tables.curricula)
    .where(eq(tables.curricula.profileId, profile.id))
    .limit(1)
    .get();
  // generateChapter: `isFirst = !curriculum` decides whether a prior summary
  // is built at all.
  if (!curriculum) return { level };
  return {
    level,
    priorSummary: buildPriorSummary(
      db,
      curriculum.id,
      profile.targetLanguage,
      level
    ),
  };
}

/**
 * Builds the preview, generating the pedagogy body first if the profile has
 * none usable. That generation is a DEEP-tier call and can take a minute; the
 * caller owns the loading state. It persists on success exactly like the
 * generation path does, so opening the preview and then generating with the
 * recommended prompt never pays the meta-call twice.
 */
export async function previewCurriculumPrompt(
  db: AppDb,
  gen: Gen,
  profileId: string,
  opts?: { force?: boolean; level?: string | null }
): Promise<PedagogyPreview> {
  const before = db
    .select()
    .from(tables.profiles)
    .where(eq(tables.profiles.id, profileId))
    .limit(1)
    .get();
  if (!before) throw new AppError("profile_missing");

  const pedagogy = await ensureCurriculumPedagogy(db, gen, profileId, opts);

  // Re-read: ensureCurriculumPedagogy may have written a fresh (unedited,
  // unstale) value, and the flags must describe what is stored NOW.
  const profile =
    db
      .select()
      .from(tables.profiles)
      .where(eq(tables.profiles.id, profileId))
      .limit(1)
      .get() ?? before;
  const info = inspectStoredPedagogy(profile);
  const { level, priorSummary } = resolvePreviewLevel(
    db,
    profile,
    opts?.level ?? null
  );
  const parts = chapterPromptParts({ profile, level, pedagogy, priorSummary });

  return {
    ...parts,
    edited: info?.edited ?? false,
    stale: info?.stale ?? false,
    level,
  };
}

/**
 * Persists a hand-edited pedagogy body (T-080). Stamped `edited: true` and
 * with the profile's CURRENT pair, so it is fresh by construction and every
 * later extend reuses the user's wording.
 *
 * The floor is `CurriculumPedagogySchema`'s own 400-char minimum: an empty or
 * near-empty body would silently produce the contentless curricula T-079 was
 * built to eliminate, and the user gets a clear rejection instead.
 */
export function saveCurriculumPedagogy(
  db: AppDb,
  profileId: string,
  body: string
): void {
  const profile = db
    .select()
    .from(tables.profiles)
    .where(eq(tables.profiles.id, profileId))
    .limit(1)
    .get();
  if (!profile) throw new AppError("profile_missing");

  const trimmed = body.trim();
  if (!CurriculumPedagogySchema.safeParse({ pedagogy: trimmed }).success) {
    throw new AppError("pedagogy_too_short");
  }

  const stored: CurriculumPedagogy = {
    pedagogy: trimmed,
    targetLanguage: profile.targetLanguage,
    nativeLanguage: profile.nativeLanguage ?? "tr",
    generatedAt: new Date().toISOString(),
    edited: true,
  };
  db.update(tables.profiles)
    .set({ curriculumPedagogy: stored })
    .where(eq(tables.profiles.id, profileId))
    .run();
}

/**
 * Generates ONE chapter (a level of the profile's scheme: JLPT/HSK/CEFR) and
 * appends it to the profile's single curriculum. The first chapter creates
 * the curriculum; later chapters stitch onto the existing prereq chain.
 * `level: null` means the scheme's first level.
 */
export async function generateChapter(
  db: AppDb,
  gen: Gen,
  profileId: string,
  levelArg: string | null,
  opts?: {
    modelUsed?: string;
    /**
     * Called right after stage 1's pedagogy body is stored on the profile,
     * BEFORE the multi-minute chapter call. Static mode passes the browser
     * DB's persist here: without it the pedagogy only reaches IndexedDB when
     * the whole chapter lands, so closing the tab mid-chapter would throw
     * away a paid deep-tier meta-call. With it, a reload finds the stored
     * body and the next generate skips straight to the chapter.
     */
    onPedagogyReady?: () => void | Promise<void>;
  }
): Promise<void> {
  const profile = db
    .select()
    .from(tables.profiles)
    .where(eq(tables.profiles.id, profileId))
    .limit(1)
    .get();
  if (!profile) throw new Error("Profil bulunamadı");

  const level = levelArg ?? schemeFor(profile.targetLanguage).levels[0];
  if (!isLevelOf(profile.targetLanguage, level)) {
    throw new Error(`Geçersiz seviye: ${level}`);
  }

  ensureChaptersBackfilled(db);

  // Resolve (or create) the profile's single curriculum.
  const curriculum = db
    .select()
    .from(tables.curricula)
    .where(eq(tables.curricula.profileId, profileId))
    .limit(1)
    .get();
  const isFirst = !curriculum;
  const curriculumId = curriculum?.id ?? nanoid();
  if (!curriculum) {
    db.insert(tables.curricula)
      .values({ id: curriculumId, profileId, status: "generating" })
      .run();
  }

  // Concurrency guard: upsert the chapter row; abort if already done/in-flight.
  const existingChapter = db
    .select()
    .from(tables.curriculumChapters)
    .where(
      and(
        eq(tables.curriculumChapters.curriculumId, curriculumId),
        eq(tables.curriculumChapters.level, level)
      )
    )
    .limit(1)
    .get();
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
        position: levelOrdinalFor(profile.targetLanguage, level),
        status: "generating",
        titleTr: level,
      })
      .onConflictDoNothing()
      .run();
  }

  const priorSummary = isFirst
    ? undefined
    : buildPriorSummary(db, curriculumId, profile.targetLanguage, level);

  try {
    // T-079 two-stage pipeline. Stage 1 (once per profile, reused by every
    // extend) writes the pedagogy for this language pair; stage 2 wraps it
    // with the data contract. Both run inside this try so a stage-1 failure
    // marks the chapter errored like any other generation failure, and both
    // run inline here, which is also what static mode needs (no jobs table
    // there: the sequential awaits ARE the pipeline).
    const pedagogy = await ensureCurriculumPedagogy(db, gen, profileId);
    await opts?.onPedagogyReady?.();
    const { system, prompt } = chapterPrompt({
      profile,
      level,
      pedagogy,
      priorSummary,
    });

    const chapter = await gen.generateJson({
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
    const chainTail = findChainTail(db, curriculumId);

    db.transaction((tx) => {
      if (isFirst) {
        tx.update(tables.curricula)
          .set({
            title: chapter.title,
            status: "ready",
            // Native language these titles/descriptions are written in (T-031).
            contentLang: profile.nativeLanguage ?? "tr",
            modelUsed: opts?.modelUsed ?? "deep",
            generatedAt: new Date(),
          })
          .where(eq(tables.curricula.id, curriculumId))
          .run();
      } else {
        // Extend appends a level in the current native language. contentLang is
        // left as-is: if it no longer matches nativeLanguage the roadmap display
        // gate already flags a mismatch and the user regenerates the whole
        // curriculum (T-031) — auto-extend only fires while languages match.
        tx.update(tables.curricula)
          .set({ status: "ready" })
          .where(eq(tables.curricula.id, curriculumId))
          .run();
      }

      let prevMainNodeId: string | null = chainTail;

      chapter.units.forEach((unit, ui) => {
        const unitId = nanoid();
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

/**
 * Re-translate a curriculum's titles/descriptions into the profile's CURRENT
 * native language, in place (T-031). The curriculum structure is
 * language-independent — only the display strings change — so we translate the
 * existing `title`/`title_tr`/`description_tr`/`subtitle_tr` columns and UPDATE
 * the same rows. Node ids, lessons, SRS cards and attempts are untouched, so no
 * progress is lost. Restamps `curricula.content_lang` on success. Returns the
 * number of strings translated (0 if already in the native language).
 */
export async function retranslateCurriculum(
  db: AppDb,
  gen: Gen,
  profileId: string
): Promise<number> {
  const profile = db
    .select()
    .from(tables.profiles)
    .where(eq(tables.profiles.id, profileId))
    .limit(1)
    .get();
  if (!profile) throw new Error("Profil bulunamadı");
  const nativeLanguage = profile.nativeLanguage ?? "tr";

  const curriculum = db
    .select()
    .from(tables.curricula)
    .where(eq(tables.curricula.profileId, profileId))
    .limit(1)
    .get();
  if (!curriculum) throw new Error("Müfredat yok");
  if ((curriculum.contentLang ?? "tr") === nativeLanguage) return 0;

  const chapters = db
    .select()
    .from(tables.curriculumChapters)
    .where(eq(tables.curriculumChapters.curriculumId, curriculum.id))
    .all();
  const units = db
    .select()
    .from(tables.units)
    .where(eq(tables.units.curriculumId, curriculum.id))
    .all();
  const unitIds = new Set(units.map((u) => u.id));
  const nodes = db
    .select()
    .from(tables.nodes)
    .all()
    .filter((n) => unitIds.has(n.unitId));

  // Collect every display string as an opaque-id'd item. Id encodes
  // table:field:rowId so the writer can route each translation back.
  const items: { id: string; text: string }[] = [];
  const push = (table: string, field: string, rowId: string, text: string) => {
    if (text && text.trim()) items.push({ id: `${table}:${field}:${rowId}`, text });
  };
  push("cur", "title", curriculum.id, curriculum.title);
  for (const c of chapters) push("chp", "titleTr", c.id, c.titleTr);
  for (const u of units) {
    push("unit", "titleTr", u.id, u.titleTr);
    push("unit", "descriptionTr", u.id, u.descriptionTr);
  }
  for (const n of nodes) {
    push("node", "titleTr", n.id, n.titleTr);
    push("node", "subtitleTr", n.id, n.subtitleTr);
  }
  if (items.length === 0) {
    db.update(tables.curricula)
      .set({ contentLang: nativeLanguage })
      .where(eq(tables.curricula.id, curriculum.id))
      .run();
    return 0;
  }

  const { curriculumTranslatePrompt } = await import(
    "@/lib/llm/prompts/curriculum"
  );
  const { CurriculumTranslationSchema } = await import("@/lib/llm/schemas");
  const { system, prompt } = curriculumTranslatePrompt({
    targetLanguage: profile.targetLanguage,
    nativeLanguage,
    items,
  });
  const result = await gen.generateJson({
    system,
    prompt,
    schema: CurriculumTranslationSchema,
    fixtureKey: "curriculum-translate",
    tier: "fast",
    timeoutMs: 120_000,
  });
  const byId = new Map(result.items.map((i) => [i.id, i.text]));

  // Every string must come back translated. If the model dropped or blanked
  // any id, restamping contentLang would clear the mismatch banner while those
  // titles stay in the old language → the exact leak this feature closes
  // (T-031). So refuse a partial result: leave contentLang unchanged (mismatch
  // stays, titles stay suppressed) and surface an error so the user retries.
  // NOTE: in fixture mode the fixture returns {items:[]}, so with a non-empty
  // curriculum every id is missing and this throws — retranslate is a real-LLM
  // action, not exercised by the token-free dev loop.
  const missing = items.filter((it) => {
    const v = byId.get(it.id);
    return !v || !v.trim();
  });
  if (missing.length > 0) {
    throw new AppError("curriculum_translate_failed");
  }

  db.transaction((tx) => {
    for (const item of items) {
      const translated = byId.get(item.id)!;
      const [table, field, rowId] = item.id.split(":");
      if (table === "cur") {
        tx.update(tables.curricula)
          .set({ title: translated })
          .where(eq(tables.curricula.id, rowId))
          .run();
      } else if (table === "chp") {
        tx.update(tables.curriculumChapters)
          .set({ titleTr: translated })
          .where(eq(tables.curriculumChapters.id, rowId))
          .run();
      } else if (table === "unit") {
        tx.update(tables.units)
          .set(
            field === "titleTr"
              ? { titleTr: translated }
              : { descriptionTr: translated }
          )
          .where(eq(tables.units.id, rowId))
          .run();
      } else if (table === "node") {
        tx.update(tables.nodes)
          .set(
            field === "titleTr"
              ? { titleTr: translated }
              : { subtitleTr: translated }
          )
          .where(eq(tables.nodes.id, rowId))
          .run();
      }
    }
    // Only now that all strings translated — flip the language stamp.
    tx.update(tables.curricula)
      .set({ contentLang: nativeLanguage })
      .where(eq(tables.curricula.id, curriculum.id))
      .run();
  });

  return items.length;
}
