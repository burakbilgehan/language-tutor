// Seed-strip (T-047). Removes seed-DERIVED content from a save snapshot before
// it goes to the cloud, because that content is already on the CDN
// (public/{grammar,kanji,vocab}-seed/<lang>.json) and re-downloading it per user
// is pure waste. Measured on the owner's DB: 19.5 MB → ~4 MB (see the ticket).
//
// This is the exact INVERSE of applyGrammarSeed/applyKanjiSeed/applyVocabSeed
// (src/core/*.ts). Those fill rows whose status is "pending"/"error" from the
// packaged seed; this puts strippable rows back into that state, so a restore
// reconstitutes them by running the very same apply* functions. Nothing here
// invents a second content pipeline.
//
// ---------------------------------------------------------------------------
// WHY THIS FILE IS ENV-AGNOSTIC AND SQL-LEVEL
//
// The upload happens IN THE BROWSER in static mode (sql.js), and on the server
// in server mode (better-sqlite3). Same precedent as ./limits.ts: kept free of
// node-only and browser-only imports so both paths share one implementation.
//
// It talks raw SQL through a tiny `StripExec` port rather than drizzle, because
// the two drivers disagree exactly where drizzle papers over things (the sql.js
// driver's relational API returns raw snake_case rows with unparsed JSON — see
// src/core/db-types.ts). Raw SQL over an explicit port has no such seam: the
// column names below are the physical ones, identical in both engines.
// Deliberately NOT placed in src/core/*, so the sql.js/query-builder rule and
// its parity harness do not apply.
//
// ---------------------------------------------------------------------------
// THE STRIP CRITERION (payload equality, NOT key presence)
//
// A row is strippable iff ALL of:
//   1. status = 'ready'                    — nothing else is reconstitutible
//   2. the seed for this language HAS this slug/char/word
//   3. the row's stored `tr` payload is DEEP-EQUAL to the seed payload,
//      compared after both sides go through the same zod schema
//
// (3) is the load-bearing one. Key-presence alone would silently destroy
// regenerated content: a user who regenerates a topic (T-022) has a `ready` row
// whose slug IS in the seed but whose content is THEIRS. Stripping that and
// "restoring" it from the CDN would hand back the generic version and lose their
// work permanently — a data-loss bug that no error message would ever surface.
// Comparing through the schema (rather than raw JSON strings) is what makes the
// comparison meaningful: the seed was written by scripts/export-*-seed.ts AFTER
// a zod parse, so key order and schema-stripped extra fields differ from the
// stored row even when the content is identical. The equivalence class that
// matters is "what the app actually reads", which is the parsed value.
//
// Content is stored lang-keyed ({tr: …, en: …}, see src/lib/llm/lang-content.ts).
// Only the `tr` half is ever seed-derived — apply*Seed refuses non-tr profiles
// because the packaged content is Turkish. So the strip removes ONLY the `tr`
// key and preserves `en`; a row holding both comes back with its English content
// intact and its Turkish half refilled from the CDN.

import { z } from "zod";
import {
  GrammarTopicSchema,
  KanjiContentSchema,
  VocabContentSchema,
  type GrammarTopicContent,
  type KanjiContent,
  type VocabContent,
} from "@/lib/llm/schemas";
import { normalizeLangContent } from "@/lib/llm/lang-content";

/**
 * Minimal synchronous SQL port. better-sqlite3 and sql.js both satisfy this
 * with a few lines of adapter (see makeBetterSqlite3Exec / makeSqlJsExec in the
 * callers) — it is the smallest surface that keeps this module driver-free.
 */
export interface StripExec {
  /** SELECT returning plain objects keyed by column name. */
  all(sql: string, params?: unknown[]): Record<string, unknown>[];
  /** INSERT/UPDATE/DELETE. */
  run(sql: string, params?: unknown[]): void;
}

/**
 * The three packaged seeds, PER TARGET LANGUAGE — exactly as the fetch/read
 * helpers return them (a map from the row's natural key: slug / char / word).
 * Any entry may be absent; a missing seed simply means nothing is strippable
 * for that language.
 *
 * The per-language nesting is NOT incidental. The seed files genuinely collide:
 * `basic-word-order`, `personal-pronouns` and `written-vs-spoken` are slugs in
 * BOTH grammar-seed/ja.json and grammar-seed/zh.json, with different content.
 * A flat merged map would compare a Japanese row against Chinese content. The
 * payload-equality rule below makes that fail SAFE (mismatch → keep the row),
 * but it would silently under-strip, so the language is part of the lookup.
 */
export interface SeedBundle {
  /** targetLanguage → (slug → content) */
  grammar?: Record<string, Record<string, GrammarTopicContent> | null | undefined>;
  /** targetLanguage → (char → content) */
  kanji?: Record<string, Record<string, KanjiContent> | null | undefined>;
  /** targetLanguage → (word → content) */
  vocab?: Record<string, Record<string, VocabContent> | null | undefined>;
}

export interface StripStats {
  grammar: number;
  kanji: number;
  vocab: number;
}

export const EMPTY_STRIP_STATS: StripStats = { grammar: 0, kanji: 0, vocab: 0 };

/**
 * Canonical JSON: object keys sorted recursively, so two structurally equal
 * values serialize identically regardless of key order. Both sides of the
 * comparison are zod OUTPUT (not raw stored JSON), so this is a true deep-equal
 * over the parsed shape.
 */
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
}

/** Parse through the schema, then canonicalize. Returns null when the value
 * doesn't satisfy the schema — an unparseable row is never strippable, since we
 * could not prove the seed would reproduce it. */
function canonicalThroughSchema(schema: z.ZodType, value: unknown): string | null {
  const parsed = schema.safeParse(value);
  return parsed.success ? canonical(parsed.data) : null;
}

/** One table's strip rule. The three tables differ only in names. */
interface TableSpec {
  table: string;
  /** Column holding the natural key that the seed map is keyed by. */
  keyColumn: string;
  schema: z.ZodType;
}

const SPECS: Record<keyof StripStats, TableSpec> = {
  grammar: { table: "grammar_topics", keyColumn: "slug", schema: GrammarTopicSchema },
  kanji: { table: "kanji_entries", keyColumn: "char", schema: KanjiContentSchema },
  vocab: { table: "vocab_entries", keyColumn: "word", schema: VocabContentSchema },
};

function stripTable(
  exec: StripExec,
  spec: TableSpec,
  byLang: Record<string, Record<string, unknown> | null | undefined> | undefined
): number {
  if (!byLang) return 0;

  let rows: Record<string, unknown>[];
  try {
    rows = exec.all(
      `SELECT id, target_language AS lang, ${spec.keyColumn} AS k, content FROM ${spec.table} ` +
        `WHERE status = 'ready' AND content IS NOT NULL`
    );
  } catch {
    // Table absent (an older image predating this dictionary) — nothing to do.
    return 0;
  }

  let stripped = 0;
  for (const row of rows) {
    const seed = byLang[row.lang as string];
    if (!seed) continue;
    const key = row.k as string;
    const seedContent = seed[key];
    if (seedContent === undefined) continue;

    let stored: unknown;
    try {
      stored = JSON.parse(row.content as string);
    } catch {
      continue; // unparseable → leave it exactly as it is
    }

    // Only the tr half is ever seed-derived; en (if present) is the user's and
    // must survive the round trip untouched.
    const map = normalizeLangContent<unknown>(stored);
    if (map.tr === undefined) continue;

    const mine = canonicalThroughSchema(spec.schema, map.tr);
    const theirs = canonicalThroughSchema(spec.schema, seedContent);
    // A row the schema rejects, or one whose content the user changed
    // (regeneration), is NOT reconstitutible from the CDN → keep it.
    if (mine === null || theirs === null || mine !== theirs) continue;

    // Put the row back into precisely the state apply*Seed looks for.
    const rest = { ...map };
    delete rest.tr;
    const remaining = Object.keys(rest).length > 0 ? JSON.stringify(rest) : null;
    exec.run(
      `UPDATE ${spec.table} SET content = ?, status = 'pending', generated_at = NULL WHERE id = ?`,
      [remaining, row.id]
    );
    stripped++;
  }
  return stripped;
}

/**
 * Strip seed-derived content in place on `exec`'s database.
 *
 * CALLER CONTRACT — this MUST run against a detached COPY of the snapshot,
 * never the live database. It deletes the user's cached content, which is only
 * safe because the copy is on its way to the cloud and the CDN can refill it.
 * Running it on the live handle would wipe the real library.
 *
 * The caller must also VACUUM afterwards: SQLite keeps freed pages, so without
 * it the file stays its original size and the entire point is lost (measured:
 * 19.5 MB stays 19.5 MB without VACUUM, becomes ~4 MB with).
 */
export function stripSeedContent(exec: StripExec, seeds: SeedBundle): StripStats {
  return {
    grammar: stripTable(exec, SPECS.grammar, seeds.grammar),
    kanji: stripTable(exec, SPECS.kanji, seeds.kanji),
    vocab: stripTable(exec, SPECS.vocab, seeds.vocab),
  };
}
