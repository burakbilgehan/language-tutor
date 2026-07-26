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
//
// ---------------------------------------------------------------------------
// THE NATIVE-LANGUAGE GATE (criterion 4 — the one that is easy to miss)
//
// All three apply*Seed functions open with `if (nativeLanguage !== "tr") return 0;`
// — the packaged content is Turkish, and handing it to an English-native user
// would be the T-031 bug. That refusal is part of the inverse we must respect:
// stripping a row that apply*Seed will then REFUSE to refill destroys it
// permanently, silently, with no error anywhere.
//
// So strippability is scoped by the profile that would do the refilling. One
// profile per target language, so we read `profiles.native_language` per
// language and skip every language whose profile is not tr-native. Concretely,
// for an en-native profile a row holding {tr: <seed>, en: <user content>} keeps
// its tr half rather than losing it forever.

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
 * sql.js adapter for the port above — THE one the browser uses.
 *
 * Exported (rather than re-written at each call site) on purpose: the upload
 * path in src/lib/backup/cloud.ts and the round-trip harness in
 * scripts/test-seed-strip.ts must run the SAME adapter, or the harness only
 * proves that its own private copy works while the shipped browser path goes
 * unexercised. Type-only import, so nothing pulls sql.js into a bundle that
 * does not already have it.
 */
export function sqlJsStripExec(db: import("sql.js").Database): StripExec {
  return {
    all: (sql, params = []) => {
      // sql.js exec() returns [{columns, values}] — reshape into plain row
      // objects so the strip module never learns which driver it is talking to.
      const res = db.exec(sql, params as never);
      if (!res.length) return [];
      const { columns, values } = res[0];
      return values.map((row) =>
        Object.fromEntries(columns.map((c, i) => [c, row[i]]))
      ) as Record<string, unknown>[];
    },
    run: (sql, params = []) => db.run(sql, params as never),
  };
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

/**
 * Target languages whose profile is Turkish-native, i.e. the ONLY ones whose
 * rows apply*Seed will refill. A language with no profile row is excluded: with
 * nobody to own it, nothing would ever call apply*Seed for it.
 */
function trNativeLanguages(exec: StripExec): Set<string> {
  try {
    const rows = exec.all(
      `SELECT target_language AS lang, native_language AS native FROM profiles`
    );
    return new Set(
      rows.filter((r) => (r.native ?? "tr") === "tr").map((r) => r.lang as string)
    );
  } catch {
    // No profiles table → not a save we understand; strip nothing.
    return new Set();
  }
}

function stripTable(
  exec: StripExec,
  spec: TableSpec,
  byLang: Record<string, Record<string, unknown> | null | undefined> | undefined,
  refillable: Set<string>,
  /** When given, records each stripped key under its language for the manifest. */
  record?: Record<string, string[]>
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
    const lang = row.lang as string;
    // apply*Seed would refuse to refill this language → stripping = data loss.
    if (!refillable.has(lang)) continue;
    const seed = byLang[lang];
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
    if (record) (record[lang] ??= []).push(key);
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
  const refillable = trNativeLanguages(exec);
  return {
    grammar: stripTable(exec, SPECS.grammar, seeds.grammar, refillable),
    kanji: stripTable(exec, SPECS.kanji, seeds.kanji, refillable),
    vocab: stripTable(exec, SPECS.vocab, seeds.vocab, refillable),
  };
}

/**
 * `save_meta` key holding the strip manifest. The blob records exactly WHICH
 * rows were removed, so a restore can tell "refilled everything" apart from
 * "some rows never came back".
 *
 * Why this is needed: the strip trades bytes for a dependency on the CDN seed.
 * If a slug is later renamed or dropped from the packaged seed, pull leaves
 * those rows pending with content NULL — the content is simply gone, and
 * nothing anywhere says so. The manifest turns that silent loss into a
 * reportable count.
 *
 * Storage choice: `save_meta` is a free-form key/value table, and BOTH import
 * validators (src/lib/save/import.ts, src/lib/backup/save-image.ts) read it
 * with a targeted `WHERE key = 'schemaVersion'` — neither enumerates keys nor
 * validates the row set. So an extra row is purely additive: it changes no
 * table shape and NO SAVE_SCHEMA_VERSION bump is required (verified: an
 * older-format import still loads a blob carrying this row).
 *
 * Written on the OUTGOING COPY ONLY — never the live database.
 */
export const STRIP_MANIFEST_KEY = "cloudStripManifest";

/** Which natural keys were stripped, per kind, per language. */
export interface StripManifest {
  version: 1;
  grammar: Record<string, string[]>;
  kanji: Record<string, string[]>;
  vocab: Record<string, string[]>;
}

/**
 * Strip AND record a manifest of what was removed, stamping it into the copy's
 * `save_meta`. Use this for anything destined for the cloud; `stripSeedContent`
 * alone remains available for callers that only want the row edits.
 */
export function stripSeedContentWithManifest(
  exec: StripExec,
  seeds: SeedBundle
): { stats: StripStats; manifest: StripManifest } {
  const refillable = trNativeLanguages(exec);
  const manifest: StripManifest = { version: 1, grammar: {}, kanji: {}, vocab: {} };

  const stats: StripStats = {
    grammar: stripTable(exec, SPECS.grammar, seeds.grammar, refillable, manifest.grammar),
    kanji: stripTable(exec, SPECS.kanji, seeds.kanji, refillable, manifest.kanji),
    vocab: stripTable(exec, SPECS.vocab, seeds.vocab, refillable, manifest.vocab),
  };

  try {
    exec.run(
      `INSERT INTO save_meta (key, value) VALUES (?, ?) ` +
        `ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [STRIP_MANIFEST_KEY, JSON.stringify(manifest)]
    );
  } catch {
    // No save_meta table (very old image) — the strip still stands, we just
    // cannot report drift for this blob.
  }

  return { stats, manifest };
}

/** Read a manifest back out of an imported save. Null when absent (an
 * un-stripped save, or one written before manifests existed). */
export function readStripManifest(exec: StripExec): StripManifest | null {
  try {
    const rows = exec.all(`SELECT value FROM save_meta WHERE key = ?`, [
      STRIP_MANIFEST_KEY,
    ]);
    const raw = rows[0]?.value;
    if (typeof raw !== "string") return null;
    const parsed = JSON.parse(raw) as StripManifest;
    return parsed && parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

/** One row the manifest says was stripped but which is still not `ready`. */
export interface UnreconstitutedRow {
  kind: keyof StripStats;
  lang: string;
  key: string;
}

/**
 * After a pull + import + seed re-apply: which stripped rows did NOT come back?
 * A non-empty result means the packaged seed no longer covers content this save
 * used to hold — real, otherwise-silent content loss.
 */
export function findUnreconstituted(
  exec: StripExec,
  manifest: StripManifest
): UnreconstitutedRow[] {
  const missing: UnreconstitutedRow[] = [];
  for (const kind of ["grammar", "kanji", "vocab"] as const) {
    const spec = SPECS[kind];
    for (const [lang, keys] of Object.entries(manifest[kind] ?? {})) {
      if (!keys.length) continue;
      let ready: Set<string>;
      try {
        ready = new Set(
          exec
            .all(
              `SELECT ${spec.keyColumn} AS k FROM ${spec.table} ` +
                `WHERE target_language = ? AND status = 'ready'`,
              [lang]
            )
            .map((r) => r.k as string)
        );
      } catch {
        continue;
      }
      for (const key of keys) {
        if (!ready.has(key)) missing.push({ kind, lang, key });
      }
    }
  }
  return missing;
}
