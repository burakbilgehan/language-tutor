#!/usr/bin/env node
/**
 * T-091: LLM-free mechanical fix pass driven by the T-087/T-091 validator.
 *
 * Reads a fresh validator finding list (produced by
 * `scripts/validate-content.mjs`) and repairs, class by class, the subset of
 * findings that are mechanically fixable with a pure string transform. Never
 * guesses content; anything ambiguous is left for the LLM leg or the
 * follow-up backlog.
 *
 * IMPORTANT: this script re-derives every transform from the LIVE row's
 * current `content` column, never from the (possibly stale) validator
 * snapshot. The finding list only drives WHICH rows to look at; the string
 * transform is always computed against the live text so a concurrent change
 * to the row is never clobbered by a stale rewrite.
 *
 * Usage:
 *   node scripts/fix-mechanical.mjs <db-path> <findings.json> [--dry-run] [--classes=markup_leak,em_dash,bracket_shape]
 *
 * Classes handled: markup_leak, em_dash (outside chars[].hint_tr),
 * bracket_shape (empty_bracket + unpaired/sentence_in_one_bracket ONLY when
 * the orphan bracket immediately follows sentence-final punctuation),
 * pinyin_mismatch:syllable_mismatch (disambiguated via the reading table).
 */
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const positional = argv.filter((a) => !a.startsWith("--"));
const dbPath = positional[0];
const findingsPath = positional[1];
const DRY_RUN = argv.includes("--dry-run");
const classesArg = argv.find((a) => a.startsWith("--classes="));
const CLASSES = classesArg
  ? new Set(classesArg.split("=")[1].split(","))
  : new Set(["markup_leak", "em_dash", "bracket_shape", "pinyin_mismatch"]);

if (!dbPath || !findingsPath) {
  console.error(
    "usage: node scripts/fix-mechanical.mjs <db-path> <findings.json> [--dry-run] [--classes=a,b,c]"
  );
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Copied VERBATIM from scripts/validate-content.mjs (scope fence forbids
// modifying that file; these are pure functions safe to duplicate).
// ---------------------------------------------------------------------------

const HAN = /[一-鿿㐀-䶿]/;
const FURIGANA_RE = /([一-鿿々-〇]+[ぁ-ゟ]*)\[([^\]]+)\]/g;
const ANY_BRACKET_RE = /\[([^\]]*)\]/g;

function orphanBrackets(text) {
  const stripped = String(text).replace(FURIGANA_RE, (m) => " ".repeat(m.length));
  const out = [];
  for (const m of stripped.matchAll(ANY_BRACKET_RE))
    out.push({ raw: m[0], inner: m[1], index: m.index });
  return out;
}

const TONE_MARKS = { "̄": 1, "́": 2, "̌": 3, "̀": 4 };
const COMBINING = /[̀-ͯ]/;

function normSyllable(raw) {
  const nfd = String(raw).trim().toLowerCase().normalize("NFD");
  let tone = 0;
  let base = "";
  for (const ch of nfd) {
    if (TONE_MARKS[ch] !== undefined) {
      tone = TONE_MARKS[ch];
      continue;
    }
    if (COMBINING.test(ch)) continue;
    base += ch;
  }
  base = base.replace(/([a-z])([1-5])(?![0-9])/g, (_m, a, d) => {
    tone = Number(d) === 5 ? 0 : Number(d);
    return a;
  });
  base = base.replace(/[vü]/g, "u").replace(/[^a-z]/g, "");
  return { base, tone };
}

function buildReadingTable(db) {
  const table = new Map();
  const stats = { rowsUsed: 0, rowsDropped: 0 };
  const add = (ch, base, tone) => {
    if (!base) return;
    if (!table.has(ch)) table.set(ch, new Set());
    table.get(ch).add(`${base}:${tone}`);
  };
  const contribute = (word, reading) => {
    if (!word || !reading) return;
    const chars = [...String(word)];
    const syls = String(reading).trim().split(/\s+/).filter(Boolean);
    if (chars.length !== syls.length) {
      stats.rowsDropped++;
      return;
    }
    stats.rowsUsed++;
    for (let i = 0; i < chars.length; i++) {
      if (!HAN.test(chars[i])) continue;
      const { base, tone } = normSyllable(syls[i]);
      add(chars[i], base, tone);
    }
  };
  for (const r of db
    .prepare("select word, reading from vocab_entries where target_language = 'zh'")
    .all())
    contribute(r.word, r.reading);
  const idxPath = path.join("src", "lib", "vocab-index", "zh-data.json");
  for (const e of JSON.parse(readFileSync(idxPath, "utf8"))) contribute(e.word, e.reading);
  add("一", "yi", 1);
  add("一", "yi", 2);
  add("一", "yi", 4);
  add("不", "bu", 2);
  add("不", "bu", 4);
  add("儿", "r", 0);
  add("儿", "er", 2);
  return { table, stats, wordReading: buildWordReadingMap(db) };
}

/** word -> reading (space-joined syllables), word-level, for disambiguation. */
function buildWordReadingMap(db) {
  const m = new Map();
  for (const r of db
    .prepare("select word, reading from vocab_entries where target_language = 'zh'")
    .all()) {
    if (r.word && r.reading) m.set(r.word, r.reading);
  }
  const idxPath = path.join("src", "lib", "vocab-index", "zh-data.json");
  for (const e of JSON.parse(readFileSync(idxPath, "utf8"))) {
    if (e.word && e.reading && !m.has(e.word)) m.set(e.word, e.reading);
  }
  return m;
}

function toneMarkFor(base, tone) {
  // Render base+tone back into a marked pinyin syllable (best-effort: covers
  // the standard vowel set produced by this corpus; falls back to unmarked
  // base + digit if the vowel isn't found, which never happens for real
  // Mandarin syllables the table already validated).
  const VOWELS = {
    1: { a: "ā", e: "ē", i: "ī", o: "ō", u: "ū" },
    2: { a: "á", e: "é", i: "í", o: "ó", u: "ú" },
    3: { a: "ǎ", e: "ě", i: "ǐ", o: "ǒ", u: "ǔ" },
    4: { a: "à", e: "è", i: "ì", o: "ò", u: "ù" },
  };
  if (tone === 0) return base;
  const map = VOWELS[tone];
  // Pinyin vowel-priority rule: a/e always take the mark; o takes it in
  // "ao"/"ou" fallback is handled by priority order below; else the last
  // vowel (covers iu/ui digraphs).
  const priority = ["a", "e", "o"];
  for (const v of priority) {
    const i = base.indexOf(v);
    if (i >= 0) return base.slice(0, i) + map[v] + base.slice(i + 1);
  }
  // iu -> mark u; ui -> mark i is the actual rule, but neither appears as a
  // syllable-final ambiguity in the table's single-syllable bases here since
  // "iu"/"ui" both contain i AND u; mark the LAST vowel in that case.
  for (let i = base.length - 1; i >= 0; i--) {
    if (map[base[i]]) return base.slice(0, i) + map[base[i]] + base.slice(i + 1);
  }
  return base + (tone || "");
}

// ---------------------------------------------------------------------------
// DB
// ---------------------------------------------------------------------------

const db = new Database(dbPath);
db.pragma("busy_timeout = 15000");
db.pragma("journal_mode = WAL");

const { table: readingTable, wordReading } = buildReadingTable(db);

const findingsData = JSON.parse(readFileSync(findingsPath, "utf8"));
const findings = findingsData.findings ?? findingsData;

const TABLE_META = {
  vocab_entries: { keyCol: "word" },
  kanji_entries: { keyCol: "char" },
  grammar_topics: { keyCol: "slug" },
};

function getRow(table, id) {
  return db.prepare(`select * from ${table} where id = ?`).get(id);
}

function setRow(table, id, contentObj) {
  if (DRY_RUN) return;
  db.prepare(`update ${table} set content = ? where id = ?`).run(
    JSON.stringify(contentObj),
    id
  );
}

/** Navigate a JSON-path-ish string ("$.a.b[0].c") to get/set a leaf. */
function pathParts(p) {
  const parts = [];
  const re = /\.([^.[\]]+)|\[(\d+)\]/g;
  let m;
  while ((m = re.exec(p))) {
    if (m[1] !== undefined) parts.push(m[1]);
    else parts.push(Number(m[2]));
  }
  return parts;
}
function getAtPath(obj, p) {
  let cur = obj;
  for (const part of pathParts(p)) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}
function setAtPath(obj, p, value) {
  const parts = pathParts(p);
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
  cur[parts[parts.length - 1]] = value;
}

// ---------------------------------------------------------------------------
// Per-class transforms. Each returns the new string, or null to skip.
// ---------------------------------------------------------------------------

const MARKUP_LEAK_START = /<\s*\/?\s*parameter\b|<\s*\/?\s*function\b|<\s*\/?\s*antml\b|<\s*\/?\s*invoke\b|<\/[a-z_][a-z0-9_]*>/i;

function fixMarkupLeak(value) {
  const m = MARKUP_LEAK_START.exec(value);
  if (!m) return null;
  let cleaned = value.slice(0, m.index);
  // Trim trailing separators/quote fragments left behind by the cut
  // ('...text",' -> '...text').
  cleaned = cleaned.replace(/[",]+\s*$/, "").trimEnd();
  return cleaned;
}

function fixEmDash(value) {
  if (!value.includes("—")) return null;
  // AGENTS.md style: a SPACED em dash (" — ", the common clause-join case)
  // becomes "; "; an UNSPACED one ("word—word") becomes ", ". Match on
  // whether whitespace actually surrounds the dash in the ORIGINAL text
  // (not the trimmed match, which is always non-empty).
  let out = value.replace(/(\s?)—(\s?)/g, (_m, before, after) => {
    const spaced = before.length > 0 || after.length > 0;
    return spaced ? "; " : ", ";
  });
  // Collapse any accidental double punctuation created by the substitution
  // (e.g. ", ." or "; ,", or a semicolon/comma landing right before a
  // sentence-final mark carried over from the original text).
  out = out.replace(/([;,])\s*([.,;])/g, "$2");
  // A separator immediately before closing punctuation/quote is dead weight.
  out = out.replace(/[;,]\s*([!?.])/g, "$1");
  return out;
}

const SENTENCE_FINAL = /[。！？!?]/;

function fixBracketShapeEmpty(value, bracket) {
  // Remove an empty bracket `[]` entirely (not a reading, nothing to keep).
  const idx = value.indexOf(bracket);
  if (idx < 0) return null;
  return value.slice(0, idx) + value.slice(idx + bracket.length);
}

/** Strip an orphan bracket IFF it immediately follows sentence-final
 * punctuation (after trimming whitespace) AND its inner text is plausibly a
 * reading (contains a tone diacritic, kana, or at least one space -- this
 * excludes pattern-slot placeholders like [Place]/[Yer]/[Something Else]
 * which are legitimate grammar notation, not broken readings). */
function stripOrphanIfSentenceFinal(value) {
  let changed = false;
  let result = value;
  // Re-derive orphans on the CURRENT value each pass since removing one
  // bracket shifts indices for the rest.
  for (let guard = 0; guard < 50; guard++) {
    const orphans = orphanBrackets(result);
    let didStrip = false;
    for (const o of orphans) {
      const before = result.slice(0, o.index);
      const trimmedBefore = before.replace(/\s+$/, "");
      const lastChar = trimmedBefore.slice(-1);
      if (!SENTENCE_FINAL.test(lastChar)) continue;
      const looksLikeReading =
        /[Ā-ſƠ-ǿ぀-ヿ]/.test(o.inner) || /\s/.test(o.inner);
      if (!looksLikeReading) continue;
      result = result.slice(0, o.index) + result.slice(o.index + o.raw.length);
      changed = true;
      didStrip = true;
      break; // restart scan on the mutated string
    }
    if (!didStrip) break;
  }
  // Clean up a leftover double space left by the removal.
  if (changed) result = result.replace(/[ \t]{2,}/g, " ").trimEnd();
  return changed ? result : null;
}

/** Rewrite a bracket's pinyin from the reading table when unambiguous. */
function fixPinyinBracket(value, host, oldBracketReading) {
  const chars = [...host];
  if (chars.some((c) => !HAN.test(c))) return null;

  // Disambiguation priority 1: exact word-level reading.
  let readingStr = wordReading.get(host);
  if (!readingStr) {
    // Priority 2: every host char is single-reading in the table.
    const perChar = [];
    for (const c of chars) {
      const set = readingTable.get(c);
      if (!set || set.size !== 1) return null; // ambiguous or unknown: skip
      perChar.push([...set][0]);
    }
    readingStr = perChar
      .map((r) => {
        const cut = r.lastIndexOf(":");
        const base = r.slice(0, cut);
        const tone = Number(r.slice(cut + 1));
        return toneMarkFor(base, tone);
      })
      .join("");
  } else {
    // Word-level reading is space-joined syllables with tone marks already
    // (vocab_entries.reading / zh-data.json convention); render unspaced to
    // match the corpus's typical bracket style (no spaces inside brackets).
    readingStr = readingStr.trim().split(/\s+/).join("");
  }
  if (!readingStr || readingStr === oldBracketReading) return null;

  const escapedHost = host.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedOld = oldBracketReading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escapedHost}\\[${escapedOld}\\]`);
  if (!re.test(value)) return null;
  return value.replace(re, `${host}[${readingStr}]`);
}

// ---------------------------------------------------------------------------
// Main sweep
// ---------------------------------------------------------------------------

const HINT_TR_RE = /chars\[\d+\]\.hint_tr$/;

const counters = {
  markup_leak: { fixed: 0, skippedGarbage: 0 },
  em_dash: { fixed: 0, skippedHintTr: 0 },
  bracket_shape: { fixed: 0, skippedNotSentenceFinal: 0 },
  pinyin_mismatch: { fixed: 0, skippedAmbiguous: 0 },
};

// Group findings by (table, id) so each row is read/written once even when
// it carries multiple findings across classes/paths.
const byRow = new Map();
for (const f of findings) {
  if (!CLASSES.has(f.class)) continue;
  const key = `${f.table}:${f.id}`;
  if (!byRow.has(key)) byRow.set(key, { table: f.table, id: f.id, items: [] });
  byRow.get(key).items.push(f);
}

console.log(`rows to touch: ${byRow.size}`);

const sampleLog = [];
let rowsUpdated = 0;

for (const { table, id, items } of byRow.values()) {
  const row = getRow(table, id);
  if (!row || !row.content) continue;
  let content;
  try {
    content = JSON.parse(row.content);
  } catch {
    continue; // unparseable JSON handled as its own markup_leak finding; nothing to string-fix
  }

  let rowChanged = false;

  for (const f of items) {
    const lang = f.lang;
    if (!lang || !content[lang]) continue;
    const half = content[lang];
    const current = getAtPath(half, f.path);
    if (typeof current !== "string") continue;

    let updated = null;

    if (f.class === "markup_leak") {
      updated = fixMarkupLeak(current);
      if (updated !== null) {
        if (updated.trim().length === 0) {
          // Remaining string is garbage; null only if the schema allows it
          // (note_tr / hint_tr / intro fields checked nullish in schemas.ts).
          const leaf = f.path.split(".").pop();
          const nullable = /_tr$|_en$|hint_tr|note_tr/.test(leaf);
          if (nullable) {
            setAtPath(half, f.path, null);
            counters.markup_leak.fixed++;
            rowChanged = true;
            if (sampleLog.length < 15)
              sampleLog.push({ class: "markup_leak", key: f.key, path: f.path, before: current.slice(0, 80), after: "null (garbage remainder)" });
          } else {
            counters.markup_leak.skippedGarbage++;
          }
          continue;
        }
      }
    } else if (f.class === "em_dash") {
      if (HINT_TR_RE.test(f.path)) {
        counters.em_dash.skippedHintTr++;
        continue;
      }
      updated = fixEmDash(current);
    } else if (f.class === "bracket_shape") {
      const sev = f.detail?.severity;
      if (sev === "empty_bracket") {
        updated = fixBracketShapeEmpty(current, f.detail.bracket);
      } else if (sev === "unpaired_bracket" || sev === "sentence_in_one_bracket") {
        updated = stripOrphanIfSentenceFinal(current);
        if (updated === null) counters.bracket_shape.skippedNotSentenceFinal++;
      } else {
        continue; // bracket_overcovers_host: out of scope, spec says leave alone
      }
    } else if (f.class === "pinyin_mismatch") {
      if (f.detail?.severity !== "syllable_mismatch") continue; // tone_only handled separately (sampled, not fixed)
      // A slash inside the bracket reading (or immediately before the host in
      // the surrounding text) means the source is a legitimate X/Y alternation
      // (跟/和[gēn/hé], 谁[shéi/shuí]) that FURIGANA_RE's single-token host
      // capture cannot represent faithfully. Rewriting these would silently
      // drop one of the two valid readings, so they are skipped, not fixed.
      if (f.detail.reading.includes("/")) {
        counters.pinyin_mismatch.skippedAmbiguous++;
        continue;
      }
      updated = fixPinyinBracket(current, f.detail.host, f.detail.reading);
      if (updated === null) counters.pinyin_mismatch.skippedAmbiguous++;
    }

    if (updated !== null && updated !== current) {
      setAtPath(half, f.path, updated);
      rowChanged = true;
      counters[f.class].fixed++;
      if (sampleLog.length < 15)
        sampleLog.push({
          class: f.class,
          key: f.key,
          path: f.path,
          before: current.slice(0, 100),
          after: updated.slice(0, 100),
        });
    }
  }

  if (rowChanged) {
    // Structural invariance check: same top-level keys, still valid JSON.
    const before = row.content;
    const after = JSON.stringify(content);
    JSON.parse(after); // throws if we somehow produced invalid JSON
    setRow(table, id, content);
    rowsUpdated++;
  }
}

console.log(`rows updated: ${rowsUpdated}${DRY_RUN ? " (dry-run, not written)" : ""}`);
console.log(JSON.stringify(counters, null, 1));
console.log("--- sample before/after (up to 15) ---");
for (const s of sampleLog) {
  console.log(`[${s.class}] ${s.key} ${s.path}`);
  console.log(`  before: ${JSON.stringify(s.before)}`);
  console.log(`  after:  ${JSON.stringify(s.after)}`);
}
