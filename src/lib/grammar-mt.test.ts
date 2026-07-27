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
import { applyGrammarSeed, ensureSeeded, listGrammarTopics } from "@/core/grammar";
import { readLangContent } from "@/lib/llm/lang-content";
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
