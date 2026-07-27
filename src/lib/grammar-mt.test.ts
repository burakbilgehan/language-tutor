// T-064: content-provenance ("source") field + the language-matched seed-apply
// gate. Permanent coverage for the two claims verified manually while building
// the fallback chain (kept as a real test per CLAUDE.md's evidence bar, not a
// temp script):
//   1. `source` survives a zod parse of GrammarTopicSchema unchanged (zod
//      object schemas strip unknown keys by default — this proves it's a
//      real declared field, not silently dropped).
//   2. applyGrammarSeed only fills a profile from a seed whose `seedLang`
//      matches that profile's nativeLanguage (the generalized T-031 guard —
//      see src/core/grammar.ts), and treats machine-translated content
//      exactly like real content for the "already filled" check (only
//      pending/error rows are touched either way).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@/db/schema";
import { DDL } from "@/db/ddl";
import {
  GrammarTopicSchema,
  isMachineTranslated,
  type GrammarTopicContent,
} from "@/lib/llm/schemas";
import {
  applyGrammarSeed,
  ensureSeeded,
  grammarNeedsGeneration,
  listGrammarTopics,
} from "@/core/grammar";
import { generateGrammarContent, type Gen } from "@/core/llm-gen";
import { mergeLangContent, readLangContent } from "@/lib/llm/lang-content";
import { titleFor } from "@/lib/grammar-index";

function openDb() {
  const sqlite = new Database(":memory:");
  for (const stmt of DDL) sqlite.exec(stmt);
  return drizzle(sqlite, { schema });
}

const sampleContent = (
  overrides: Partial<GrammarTopicContent> = {}
): GrammarTopicContent => ({
  title_tr: "Test konu",
  intro_tr: "Test açıklama",
  tables: [
    { caption_tr: "Tablo", column_headers: ["a", "b"], rows: [["1", "2"]] },
  ],
  examples: [
    { target: "a", translation_tr: "b" },
    { target: "c", translation_tr: "d" },
  ],
  ...overrides,
});

test("GrammarTopicSchema keeps the source field through a parse round-trip", () => {
  const withMt = GrammarTopicSchema.parse(sampleContent({ source: "mt" }));
  assert.equal(withMt.source, "mt");
  assert.equal(isMachineTranslated(withMt), true);

  const withoutSource = GrammarTopicSchema.parse(sampleContent());
  assert.equal(withoutSource.source, undefined);
  assert.equal(isMachineTranslated(withoutSource), false);
  assert.equal(isMachineTranslated(null), false);
  assert.equal(isMachineTranslated(undefined), false);
});

test("applyGrammarSeed only fills a profile whose nativeLanguage matches seedLang", () => {
  const db = db_insertPendingTopic();

  // tr seed offered to an en-native profile → refused (T-031 guard,
  // generalized: seedLang must equal nativeLanguage, not hardcoded to tr).
  const filledWrongLang = applyGrammarSeed(
    db as never,
    "ja",
    { "test-slug": sampleContent() },
    "en", // profile's nativeLanguage
    "tr" // seed's own language
  );
  assert.equal(filledWrongLang, 0);
  const stillPending = db
    .select()
    .from(schema.grammarTopics)
    .all()[0];
  assert.equal(stillPending.status, "pending");

  // MT seed for en offered to an en-native profile → applied, stamped mt.
  const filled = applyGrammarSeed(
    db as never,
    "ja",
    { "test-slug": sampleContent({ source: "mt" }) },
    "en",
    "en"
  );
  assert.equal(filled, 1);
  const row = db.select().from(schema.grammarTopics).all()[0];
  assert.equal(row.status, "ready");
  const localized = readLangContent<GrammarTopicContent>(row.content, "en");
  assert.ok(localized);
  assert.equal(isMachineTranslated(localized), true);
});

test("applyGrammarSeed still applies the real tr packaged seed to a tr-native profile", () => {
  const db = db_insertPendingTopic();
  const filled = applyGrammarSeed(
    db as never,
    "ja",
    { "test-slug": sampleContent() }, // no source → real content
    "tr",
    "tr"
  );
  assert.equal(filled, 1);
  const row = db.select().from(schema.grammarTopics).all()[0];
  assert.equal(row.status, "ready");
  const localized = readLangContent<GrammarTopicContent>(row.content, "tr");
  assert.equal(isMachineTranslated(localized), false);
});

test("end-to-end: an en-native ja profile gets the real MT seed, untranslated slugs stay honestly pending", (t) => {
  const seedPath = path.join(process.cwd(), "public", "grammar-seed", "ja.en.json");
  if (!fs.existsSync(seedPath)) {
    t.skip("public/grammar-seed/ja.en.json not present in this checkout");
    return;
  }
  const seedFile = JSON.parse(fs.readFileSync(seedPath, "utf8")) as {
    version: number;
    topics: Record<string, GrammarTopicContent>;
  };
  const translatedSlugs = Object.keys(seedFile.topics);
  assert.ok(translatedSlugs.length > 0, "the committed MT seed file must be non-empty");

  const db = openDb();
  // Real self-healing path: seeds the whole ja grammar index (298 topics),
  // every row starting "pending" — exactly what a fresh en-native ja profile
  // sees before any content exists.
  ensureSeeded(db as never, "ja");

  const filled = applyGrammarSeed(
    db as never,
    "ja",
    seedFile.topics,
    "en", // profile's nativeLanguage
    "en" // this file's own language
  );
  assert.equal(filled, translatedSlugs.length);

  const topics = listGrammarTopics(db as never, "ja", "en");
  assert.ok(topics.length > translatedSlugs.length, "the full ja index should be seeded");

  for (const slug of translatedSlugs) {
    const row = topics.find((tp) => tp.slug === slug);
    assert.ok(row, `${slug} should exist in the index`);
    assert.equal(row!.status, "ready", `${slug} should read ready (MT-filled)`);
  }

  // Honest gap: a slug the MT run hasn't reached yet must NOT silently read
  // ready — it's what layer 4 (the UI's no-LLM CTA) keys off.
  const untranslated = topics.find(
    (tp) => !translatedSlugs.includes(tp.slug)
  );
  assert.ok(untranslated, "there should be at least one not-yet-translated topic");
  assert.equal(untranslated!.status, "pending");
});

test("titleFor resolves a real committed title translation, falls back for an untranslated slug", () => {
  const titlesPath = path.join(
    process.cwd(),
    "src",
    "lib",
    "grammar-index",
    "titles.ja.en.json"
  );
  const titles = JSON.parse(fs.readFileSync(titlesPath, "utf8")) as Record<string, string>;
  const [translatedSlug] = Object.keys(titles);
  if (!translatedSlug) {
    // The committed file is the {} placeholder (titles pass hasn't run in
    // this checkout) — titleFor must fall back to the tr title, not throw.
    assert.equal(titleFor("ja", "wa-topic-particle", "は Konu Edatı", "en"), "は Konu Edatı");
    return;
  }
  assert.equal(
    titleFor("ja", translatedSlug, "SHOULD NOT SEE THIS", "en"),
    titles[translatedSlug]
  );
  // tr native always gets the tr title regardless of what's translated.
  assert.equal(titleFor("ja", translatedSlug, "tr başlık", "tr"), "tr başlık");
  // A slug not present in the titles file falls back to the given tr title.
  assert.equal(
    titleFor("ja", "definitely-not-a-real-slug", "tr başlık", "en"),
    "tr başlık"
  );
});

test("applyGrammarSeed never overwrites a FILLED slot, whatever its provenance", () => {
  const db = openDb();
  const mtContent = sampleContent({ intro_tr: "MT içerik", source: "mt" });
  const realContent = sampleContent({ intro_tr: "Kullanıcının gerçek içeriği" });
  db.insert(schema.grammarTopics)
    .values([
      {
        id: "t-mt",
        targetLanguage: "ja",
        slug: "slug-mt",
        titleTr: "T",
        category: "particles",
        position: 0,
        status: "ready",
        content: mergeLangContent(null, "en", mtContent),
      },
      {
        id: "t-real",
        targetLanguage: "ja",
        slug: "slug-real",
        titleTr: "T",
        category: "particles",
        position: 1,
        status: "ready",
        content: mergeLangContent(null, "tr", realContent),
      },
    ])
    .run();

  // A NEWER en seed over an already-MT-filled en slot → untouched.
  const overMt = applyGrammarSeed(
    db as never,
    "ja",
    { "slug-mt": sampleContent({ intro_tr: "yeni seed", source: "mt" }) },
    "en",
    "en"
  );
  assert.equal(overMt, 0);
  // A tr seed over a user's real tr content → untouched, byte for byte.
  const overReal = applyGrammarSeed(
    db as never,
    "ja",
    { "slug-real": sampleContent({ intro_tr: "seed'in farklı içeriği" }) },
    "tr",
    "tr"
  );
  assert.equal(overReal, 0);

  const rows = db.select().from(schema.grammarTopics).all();
  assert.deepEqual(
    readLangContent(rows.find((r) => r.id === "t-mt")!.content, "en"),
    mtContent
  );
  assert.deepEqual(
    readLangContent(rows.find((r) => r.id === "t-real")!.content, "tr"),
    realContent
  );
});

test("MT seed fills the EMPTY en slot of a tr-seeded ready row (nativeLanguage switch, T-064)", () => {
  const db = openDb();
  const trContent = sampleContent({ intro_tr: "tr seed içeriği" });
  db.insert(schema.grammarTopics)
    .values({
      id: "t-switch",
      targetLanguage: "ja",
      slug: "test-slug",
      titleTr: "T",
      category: "particles",
      position: 0,
      status: "ready", // filled by the tr seed, owner then switched native to en
      content: mergeLangContent(null, "tr", trContent),
    })
    .run();

  const filled = applyGrammarSeed(
    db as never,
    "ja",
    { "test-slug": sampleContent({ intro_tr: "en MT", source: "mt" }) },
    "en",
    "en"
  );
  assert.equal(filled, 1);
  const row = db.select().from(schema.grammarTopics).all()[0];
  assert.equal(row.status, "ready");
  // Both halves coexist: tr byte-identical, en slot now MT.
  assert.deepEqual(readLangContent(row.content, "tr"), trContent);
  const en = readLangContent<GrammarTopicContent>(row.content, "en");
  assert.ok(en && isMachineTranslated(en));
});

test("grammarNeedsGeneration: MT and missing-language rows need a pass; real content and running jobs don't", () => {
  const mt = mergeLangContent(null, "en", sampleContent({ source: "mt" }));
  const real = mergeLangContent(null, "en", sampleContent());
  const trOnly = mergeLangContent(null, "tr", sampleContent());

  assert.equal(grammarNeedsGeneration({ status: "pending", content: null }, "en"), true);
  assert.equal(grammarNeedsGeneration({ status: "error", content: null }, "en"), true);
  assert.equal(grammarNeedsGeneration({ status: "generating", content: null }, "en"), false);
  assert.equal(grammarNeedsGeneration({ status: "ready", content: mt }, "en"), true);
  assert.equal(grammarNeedsGeneration({ status: "ready", content: real }, "en"), false);
  assert.equal(grammarNeedsGeneration({ status: "ready", content: trOnly }, "en"), true);
  assert.equal(grammarNeedsGeneration({ status: "ready", content: trOnly }, "tr"), false);
});

test("a real LLM generation overrides MT content and strips a model-emitted source field", async () => {
  const db = openDb();
  db.insert(schema.profiles)
    .values({
      id: "p-en",
      targetLanguage: "ja",
      nativeLanguage: "en",
      displayName: "Test",
      goals: [],
      selfLevel: "zero",
      minutesPerWeek: 60,
      interests: [],
      isActive: true,
    })
    .run();
  db.insert(schema.grammarTopics)
    .values({
      id: "t-gen",
      targetLanguage: "ja",
      slug: "test-slug",
      titleTr: "T",
      category: "particles",
      position: 0,
      status: "ready",
      content: mergeLangContent(null, "en", sampleContent({ source: "mt" })),
    })
    .run();

  // Stub Gen that (maliciously/accidentally) echoes source:"mt" back — the
  // write path must strip it so a real generation is never mislabeled.
  const stubGen: Gen = {
    async generateJson() {
      return sampleContent({
        intro_tr: "Fresh LLM content",
        source: "mt",
      }) as never;
    },
    async generateText() {
      return "";
    },
  };
  await generateGrammarContent(db as never, stubGen, "t-gen");

  const row = db.select().from(schema.grammarTopics).all()[0];
  assert.equal(row.status, "ready");
  const en = readLangContent<GrammarTopicContent>(row.content, "en");
  assert.ok(en);
  assert.equal(en!.intro_tr, "Fresh LLM content"); // MT overridden
  assert.equal(en!.source, undefined); // model-emitted source stripped
  assert.equal(isMachineTranslated(en), false);
});

function db_insertPendingTopic() {
  const db = openDb();
  db.insert(schema.grammarTopics)
    .values({
      id: "topic-1",
      targetLanguage: "ja",
      slug: "test-slug",
      titleTr: "Test",
      category: "particles",
      position: 0,
      status: "pending",
    })
    .run();
  return db;
}
