import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
  stripSeedContent,
  stripSeedContentWithManifest,
  readStripManifest,
  findUnreconstituted,
  type StripExec,
  type SeedBundle,
} from "./seed-strip";
import {
  grammarPayload,
  kanjiPayload,
  vocabPayload,
} from "./__fixtures__/payloads";

/**
 * Seed-strip behaviour, on a tiny synthetic fixture (44 KB, built by
 * scripts/build-strip-fixture.mjs) so this runs in `npm test` without the
 * owner's real 19.5 MB database. The full-scale proof against real data stays
 * in scripts/test-seed-strip.ts.
 *
 * Every case here is one the strip could get wrong in a way that DESTROYS user
 * data, which is why they are unit-pinned rather than left to the manual harness.
 */

const FIXTURE = path.join(import.meta.dirname, "__fixtures__", "strip-fixture.db");

function exec(db: Database.Database): StripExec {
  return {
    all: (sql, params = []) =>
      db.prepare(sql).all(...(params as never[])) as Record<string, unknown>[],
    run: (sql, params = []) => {
      db.prepare(sql).run(...(params as never[]));
    },
  };
}

/** Seeds mirroring what the CDN would serve for the fixture. Payloads are the
 * SAME builders the fixture was generated with — the strip compares through the
 * real zod schemas, so a hand-written near-miss would be rejected as
 * un-strippable and every assertion here would fail for the wrong reason. */
function seeds(): SeedBundle {
  return {
    grammar: {
      ja: {
        "seed-match": grammarPayload("a"),
        "keeps-en": grammarPayload("b"),
        // The generic version the USER edited away from — stored row differs.
        regenerated: grammarPayload("generic"),
        "pending-row": grammarPayload("p"),
      },
      // Colliding slug, DIFFERENT content from ja's.
      zh: {
        "seed-match": grammarPayload("zh-version"),
        "zh-only": grammarPayload("zh-only"),
      },
      nl: { "nl-topic": grammarPayload("nl") },
    } as never,
    kanji: { ja: { 日: kanjiPayload("k") } } as never,
    vocab: { zh: { 的: vocabPayload("v") } } as never,
  };
}

function openFixture(): Database.Database {
  const tmp = path.join(
    fs.mkdtempSync(path.join(process.env.TMPDIR ?? "/tmp", "strip-test-")),
    "f.db"
  );
  fs.copyFileSync(FIXTURE, tmp);
  return new Database(tmp);
}

function statusOf(db: Database.Database, slug: string, lang: string): string {
  return (
    db
      .prepare(
        "SELECT status FROM grammar_topics WHERE slug = ? AND target_language = ?"
      )
      .get(slug, lang) as { status: string }
  ).status;
}
function contentOf(db: Database.Database, slug: string, lang: string): string | null {
  return (
    db
      .prepare(
        "SELECT content FROM grammar_topics WHERE slug = ? AND target_language = ?"
      )
      .get(slug, lang) as { content: string | null }
  ).content;
}

test("strips a row whose stored content matches the seed", () => {
  const db = openFixture();
  stripSeedContent(exec(db), seeds());
  assert.equal(statusOf(db, "seed-match", "ja"), "pending");
  assert.equal(contentOf(db, "seed-match", "ja"), null);
  db.close();
});

test("KEEPS user-regenerated content whose slug is in the seed", () => {
  // The data-loss case: key-presence-only stripping would delete the user's
  // own regenerated topic and 'restore' the generic CDN version over it.
  const db = openFixture();
  stripSeedContent(exec(db), seeds());
  assert.equal(statusOf(db, "regenerated", "ja"), "ready");
  assert.match(contentOf(db, "regenerated", "ja")!, /USER-EDITED/);
  db.close();
});

test("preserves the en half while stripping the seed-derived tr half", () => {
  const db = openFixture();
  stripSeedContent(exec(db), seeds());
  assert.equal(statusOf(db, "keeps-en", "ja"), "pending");
  const left = JSON.parse(contentOf(db, "keeps-en", "ja")!);
  assert.equal(left.tr, undefined, "tr half should be stripped");
  assert.match(JSON.stringify(left.en), /EN/, "en half must survive");
  db.close();
});

test("never strips a language whose profile is not tr-native", () => {
  // apply*Seed refuses non-tr profiles, so stripping here loses content forever.
  const db = openFixture();
  stripSeedContent(exec(db), seeds());
  assert.equal(statusOf(db, "zh-only", "zh"), "ready");
  assert.equal(statusOf(db, "seed-match", "zh"), "ready");
  db.close();
});

test("colliding slugs are matched per language, not across", () => {
  // 'seed-match' exists in ja and zh with different content. ja strips (it
  // matches ja's seed); zh is en-native here so it is kept regardless.
  const db = openFixture();
  stripSeedContent(exec(db), seeds());
  assert.equal(statusOf(db, "seed-match", "ja"), "pending");
  assert.match(contentOf(db, "seed-match", "zh")!, /zh-version/);
  db.close();
});

test("leaves rows absent from the seed alone", () => {
  const db = openFixture();
  stripSeedContent(exec(db), seeds());
  assert.equal(statusOf(db, "not-in-seed", "ja"), "ready");
  db.close();
});

test("manifest records exactly what was stripped and detects seed drift", () => {
  const db = openFixture();
  const { stats, manifest } = stripSeedContentWithManifest(exec(db), seeds());

  const recorded = Object.values(manifest.grammar).flat().length;
  assert.equal(recorded, stats.grammar);
  assert.ok(manifest.grammar.ja.includes("seed-match"));
  assert.equal(manifest.grammar.zh, undefined, "en-native language must not appear");

  // Survives serialization into save_meta.
  const readBack = readStripManifest(exec(db));
  assert.ok(readBack, "manifest should be readable back out of save_meta");

  // Nothing re-applied yet → every stripped row is unreconstituted.
  const drift = findUnreconstituted(exec(db), readBack!);
  assert.equal(drift.length, recorded + stats.kanji + stats.vocab);
  assert.ok(drift.some((d) => d.key === "seed-match" && d.lang === "ja"));
  db.close();
});

test("manifest row does not disturb the schemaVersion lookup", () => {
  // Why no SAVE_SCHEMA_VERSION bump is needed: save_meta is free-form, and both
  // import validators read it with a targeted WHERE key = 'schemaVersion'.
  const db = openFixture();
  stripSeedContentWithManifest(exec(db), seeds());
  const row = db
    .prepare("SELECT value FROM save_meta WHERE key = 'schemaVersion'")
    .get() as { value: string };
  assert.equal(row.value, "8");
  db.close();
});
