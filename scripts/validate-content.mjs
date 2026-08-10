#!/usr/bin/env node
/**
 * T-087: LLM-free mechanical content validator.
 *
 * Sweeps the whole generated corpus (zh vocab, ja kanji, grammar topics in
 * every language, both the tr and en payload halves) and reports six classes
 * of mechanically detectable defect found by the T-023 audit. It is strictly
 * read-only: the DB is opened with `readonly: true` and nothing is written
 * back. The output is a machine-readable JSON work list (for T-091) plus a
 * human summary.
 *
 * Usage:
 *   node scripts/validate-content.mjs [db-path] [--json out.json] [--md out.md]
 *
 * The default DB path is `data/audit-snapshot.db`, a snapshot taken with
 * `sqlite3 "file:data/app.db?mode=ro" ".backup data/audit-snapshot.db"`, so a
 * concurrent writer on the live snapshot cannot affect a run.
 *
 * Classes:
 *   1 pinyin_mismatch    bracket pinyin that no per-character reading can spell
 *   2 headword_missing   examples/collocations that omit the item they teach
 *   3 markup_leak        generation markup (<parameter, </tag, <function) in content
 *   4 script_contamination  foreign-script letters inside target-language text
 *   5 bracket_shape      brackets that the Furigana renderer cannot pair
 *   6 em_dash            U+2014, banned by AGENTS.md
 */
import Database from "better-sqlite3";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
let dbPath = "data/audit-snapshot.db";
let jsonOut = "tickets/T-087-validator-report.json";
let mdOut = "tickets/T-087-validator-summary.md";
const positional = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--json") jsonOut = argv[++i];
  else if (argv[i] === "--md") mdOut = argv[++i];
  else positional.push(argv[i]);
}
if (positional[0]) dbPath = positional[0];

const EXCERPT_MAX = 200;

/**
 * AGENTS.md bans U+2014 from every committed output, and this report is
 * committed, so excerpts carrying one are escaped to a visible token rather
 * than reproducing the character.
 */
const EM_DASH = "—";
const excerpt = (s) => {
  const t = String(s).replaceAll(EM_DASH, "<U+2014>");
  return t.length > EXCERPT_MAX ? t.slice(0, EXCERPT_MAX) + "..." : t;
};

// Class 1 only judges hosts at word scale; see the routing comment below.
const MAX_PINYIN_HOST_CHARS = 4;

// ---------------------------------------------------------------------------
// Pinyin normalization (local on purpose)
//
// src/lib/zh.ts `foldPinyin` is for answer matching and strips tone entirely,
// which would silence the exact class this validator hunts. Tone is kept as a
// separate per-letter mark here.
// ---------------------------------------------------------------------------

const TONE_MARKS = { "̄": 1, "́": 2, "̌": 3, "̀": 4 };
const COMBINING = /[̀-ͯ]/;
const HAN = /[一-鿿㐀-䶿]/;

/** One syllable to {base, tone}; tone 0 means neutral or unmarked. */
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

/**
 * Flatten a bracket reading into bare letters plus a per-letter tone mark
 * array. A tone mark attaches to the letter it sits on, so an unspaced
 * reading ("manhua") keeps its syllable tones distinguishable from a spaced
 * one, and a missing mark stays visible as 0 instead of being smeared across
 * the run.
 */
function flattenReading(raw) {
  const nfd = String(raw).trim().toLowerCase().normalize("NFD");
  const letters = [];
  const marks = [];
  for (const ch of nfd) {
    if (TONE_MARKS[ch] !== undefined) {
      if (letters.length) marks[letters.length - 1] = TONE_MARKS[ch];
      continue;
    }
    if (COMBINING.test(ch)) continue;
    if (/[a-zü]/.test(ch)) {
      letters.push(ch === "ü" || ch === "v" ? "u" : ch);
      marks.push(0);
      continue;
    }
    if (/[1-5]/.test(ch)) {
      if (letters.length)
        marks[letters.length - 1] = Number(ch) === 5 ? 0 : Number(ch);
      continue;
    }
    // separators contribute no letters
  }
  return { letters: letters.join(""), marks };
}

// ---------------------------------------------------------------------------
// Per-character reading table
// ---------------------------------------------------------------------------

/**
 * Build char -> Set("base:tone") from the two static sources: the
 * `vocab_entries.reading` column (dictionary fact, not LLM output) and the
 * committed HSK index. A row only contributes when its character count equals
 * its syllable count, so a malformed reading never pollutes the table.
 */
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
    .prepare(
      "select word, reading from vocab_entries where target_language = 'zh'"
    )
    .all())
    contribute(r.word, r.reading);

  const idxPath = path.join("src", "lib", "vocab-index", "zh-data.json");
  for (const e of JSON.parse(readFileSync(idxPath, "utf8")))
    contribute(e.word, e.reading);

  // Standard orthography writes tone sandhi, so the surface form of 一 and 不
  // legitimately differs from their dictionary tone; erhua contracts 儿 to a
  // bare -r. Without these the validator would flag correct pinyin
  // (bushi -> búshì, yiding -> yídìng, yidianr -> yìdiǎnr).
  add("一", "yi", 1);
  add("一", "yi", 2);
  add("一", "yi", 4);
  add("不", "bu", 2);
  add("不", "bu", 4);
  add("儿", "r", 0);
  add("儿", "er", 2);

  return { table, stats };
}

/**
 * Can one reading per host character be chosen so their bases concatenate to
 * exactly the bracket's letters, each pick's tone agreeing with the mark
 * observed over the letters it consumed? A span carrying no mark only
 * satisfies a neutral (tone 0) reading, so a dropped tone stays a finding
 * instead of matching everything.
 *
 * Returns { ok: true|false|null }; null means "cannot judge" (a host
 * character is missing from the table, or the reading is not pinyin), and
 * never produces a finding.
 */
function checkBracket(word, bracket, table) {
  const chars = [...String(word)];
  if (!chars.length) return { ok: null, reason: "empty_host" };
  if (chars.some((c) => !HAN.test(c))) return { ok: null, reason: "non_han_host" };
  const sets = chars.map((c) => table.get(c));
  const missing = chars.filter((c) => !table.has(c));
  if (missing.length) return { ok: null, reason: "unknown_char", missing };
  const { letters, marks } = flattenReading(bracket);
  if (!letters) return { ok: null, reason: "empty_reading" };

  let memo = new Set();
  const walk = (ci, pos) => {
    if (ci === chars.length) return pos === letters.length;
    const key = ci * 4096 + pos;
    if (memo.has(key)) return false;
    // Immediate reduplication neutralizes the second syllable's tone in
    // standard orthography (慢慢 -> mànman, 漂漂亮亮 -> piàopiaoliàngliàng),
    // so an unmarked span is legitimate there. This is deliberately narrow:
    // a blanket "unmarked matches any tone" rule would silence the dropped
    // tones this class exists to find.
    const reduplicated = ci > 0 && chars[ci] === chars[ci - 1];
    for (const r of sets[ci]) {
      const cut = r.lastIndexOf(":");
      const base = r.slice(0, cut);
      const tone = Number(r.slice(cut + 1));
      if (!letters.startsWith(base, pos)) continue;
      let observed = 0;
      let count = 0;
      for (let k = pos; k < pos + base.length; k++)
        if (marks[k]) {
          observed = marks[k];
          count++;
        }
      const toneOk =
        observed === tone || (reduplicated && observed === 0 && count === 0);
      if (count <= 1 && toneOk && walk(ci + 1, pos + base.length)) return true;
    }
    memo.add(key);
    return false;
  };
  if (walk(0, 0)) return { ok: true };

  // The renderer's regex takes the WHOLE preceding CJK run as the host, so a
  // correct reading for the final word ends up attached to the words before it
  // too (的行为[xíngwéi], 这款游戏[yóuxì]). If the reading exactly spells some
  // SUFFIX of the host, the pinyin is right and the bracket's coverage is
  // wrong; that is a shape defect, not a reading error. Checked by rerunning
  // the same search from a later starting character.
  for (let k = 1; k < chars.length; k++) {
    memo = new Set();
    if (walk(k, 0))
      return {
        ok: null,
        reason: "host_overcapture",
        coveredSuffix: chars.slice(k).join(""),
        extraPrefix: chars.slice(0, k).join(""),
      };
  }
  // Distinguish "only the tone marks are wrong or missing" from a genuinely
  // wrong syllable: rerun ignoring tone entirely.
  const memo2 = new Set();
  const walkToneless = (ci, pos) => {
    if (ci === chars.length) return pos === letters.length;
    const key = ci * 4096 + pos;
    if (memo2.has(key)) return false;
    for (const r of sets[ci]) {
      const base = r.slice(0, r.lastIndexOf(":"));
      if (letters.startsWith(base, pos) && walkToneless(ci + 1, pos + base.length))
        return true;
    }
    memo2.add(key);
    return false;
  };
  const tonelessOk = walkToneless(0, 0);
  const expected = chars
    .map((c) => [...table.get(c)].map((r) => r.replace(":", "")).join("/"))
    .join(" ");
  return {
    ok: false,
    severity: tonelessOk ? "tone_only" : "syllable_mismatch",
    expected,
  };
}

// ---------------------------------------------------------------------------
// Bracket parsing (mirrors src/lib/jp.ts FURIGANA_RE and the Furigana renderer)
// ---------------------------------------------------------------------------

// The renderer pairs a bracket with the CJK token immediately before it. A
// bracket preceded by punctuation, latin, or whitespace matches nothing and is
// rendered as literal text.
const FURIGANA_RE = /([一-鿿々-〇]+[ぁ-ゟ]*)\[([^\]]+)\]/g;
const ANY_BRACKET_RE = /\[([^\]]*)\]/g;
const SENTENCE_PUNCT = /[。，！？、.,!?;:]/;

/** Every bracket the renderer will pair, as {host, reading, index}. */
function pairedBrackets(text) {
  const out = [];
  for (const m of String(text).matchAll(FURIGANA_RE))
    out.push({ host: m[1], reading: m[2], index: m.index, raw: m[0] });
  return out;
}

/**
 * Brackets the renderer will NOT pair: remove every paired match, then look
 * for what is left. These render as literal "[...]" to the learner.
 */
function orphanBrackets(text) {
  const stripped = String(text).replace(FURIGANA_RE, (m) => " ".repeat(m.length));
  const out = [];
  for (const m of stripped.matchAll(ANY_BRACKET_RE))
    out.push({ raw: m[0], inner: m[1], index: m.index });
  return out;
}

/** Strip bracket readings the way the renderer does: 漢字[かんじ] -> 漢字. */
const stripBrackets = (text) =>
  String(text).replace(FURIGANA_RE, "$1").replace(ANY_BRACKET_RE, "");

// ---------------------------------------------------------------------------
// Script contamination
// ---------------------------------------------------------------------------

const FOREIGN_SCRIPTS = [
  ["cyrillic", /[Ѐ-ӿ]/g],
  ["hangul", /[가-힯ᄀ-ᇿ㄰-㆏]/g],
  ["greek", /[Ͱ-Ͽ]/g],
  ["arabic", /[؀-ۿ]/g],
  ["hebrew", /[֐-׿]/g],
  ["devanagari", /[ऀ-ॿ]/g],
  ["thai", /[฀-๿]/g],
  ["armenian", /[԰-֏]/g],
  ["georgian", /[Ⴀ-ჿ]/g],
];

const KANA = /[぀-ヿ]/;
const LATIN_WORD = /[A-Za-z][A-Za-z'-]{1,}/g;

// ---------------------------------------------------------------------------
// Generic payload walk
// ---------------------------------------------------------------------------

/** Yield every string leaf as {path, value} with a JSON-path-ish key. */
function* walkStrings(node, prefix = "$") {
  if (typeof node === "string") {
    yield { path: prefix, value: node };
    return;
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++)
      yield* walkStrings(node[i], `${prefix}[${i}]`);
    return;
  }
  if (node && typeof node === "object") {
    for (const k of Object.keys(node)) yield* walkStrings(node[k], `${prefix}.${k}`);
  }
}

/**
 * Which checks a field is eligible for, decided by its JSON path.
 * `target` fields hold target-language text (bracket notation lives here);
 * `native` fields hold learner-native prose, which may still carry inline
 * bracketed target words.
 */
function fieldKind(p) {
  const leaf = p.replace(/\[\d+\]/g, "").split(".").pop() ?? "";
  if (/_tr$|_en$|^translation|^meaning|^hint|^note|^caption/.test(leaf))
    return "native";
  if (
    /^sentence$|^phrase$|^target$|^word$|^char$|^reading$|^term$|^example$|^title/.test(
      leaf
    )
  )
    return "target";
  return "other";
}

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------

const findings = [];
function file(f) {
  findings.push(f);
}

// ---------------------------------------------------------------------------
// Main sweep
// ---------------------------------------------------------------------------

const db = new Database(dbPath, { readonly: true });
const { table: readingTable, stats: tableStats } = buildReadingTable(db);

const MARKUP_PATTERNS = [
  ["parameter_tag", /<\s*\/?\s*parameter\b/gi],
  ["function_tag", /<\s*\/?\s*function\b/gi],
  ["antml_tag", /<\s*\/?\s*antml\b/gi],
  ["invoke_tag", /<\s*\/?\s*invoke\b/gi],
  ["closing_tag", /<\/[a-z_][a-z0-9_]*>/gi],
  ["json_key_leak", /"\s*(?:related_slugs|classifier_note_tr|note_tr)"\s*:/g],
];

const surfaceStats = new Map();
function bump(surface, key) {
  if (!surfaceStats.has(surface))
    surfaceStats.set(surface, { rows: 0, flaggedItems: new Set(), classes: {} });
  const s = surfaceStats.get(surface);
  if (key) s.classes[key] = (s.classes[key] ?? 0) + 1;
  return s;
}

const class1Skips = { unknown_char: 0, non_han_host: 0, other: 0, checked: 0 };
const class1FailChars = new Map();

/**
 * Run every field-level check for one string leaf.
 * `item` carries the row identity; `ctx` the surface configuration.
 */
function checkString(item, surface, lang, jsonPath, value, ctx) {
  const kind = fieldKind(jsonPath);
  const base = {
    surface,
    table: ctx.table,
    id: item.id,
    key: item.key,
    lang,
    path: jsonPath,
  };

  // Class 3: markup leak.
  for (const [name, re] of MARKUP_PATTERNS) {
    re.lastIndex = 0;
    const m = re.exec(value);
    if (m) {
      file({
        ...base,
        class: "markup_leak",
        detail: { pattern: name, match: m[0], excerpt: excerpt(value) },
      });
      break;
    }
  }

  // Class 6: em dash (U+2014). Learner-facing strings only.
  if (kind !== "other" || /intro|explanation|footnote|header|rows/.test(jsonPath)) {
    const count = (value.match(/—/g) ?? []).length;
    if (count)
      file({
        ...base,
        class: "em_dash",
        detail: { count, systemic: true, excerpt: excerpt(value) },
      });
  }

  // Class 4: script contamination. Any foreign script anywhere is a defect;
  // latin words inside target text are a lower-confidence subclass.
  for (const [name, re] of FOREIGN_SCRIPTS) {
    re.lastIndex = 0;
    const hits = value.match(re);
    if (hits) {
      file({
        ...base,
        class: "script_contamination",
        detail: {
          script: name,
          severity: "foreign_script",
          sample: hits.slice(0, 8).join(""),
          excerpt: excerpt(value),
        },
      });
      break;
    }
  }
  if (kind === "target" && ctx.cjk) {
    // Latin words mixed into CJK target text (the you-you "又high又dà" case).
    // Bracket readings are latin by design, so compare on the stripped form.
    const stripped = stripBrackets(value);
    if (HAN.test(stripped) || KANA.test(stripped)) {
      LATIN_WORD.lastIndex = 0;
      const words = stripped.match(LATIN_WORD);
      if (words)
        file({
          ...base,
          class: "script_contamination",
          detail: {
            script: "latin_in_cjk",
            severity: "latin_in_target",
            sample: words.slice(0, 8).join(" "),
            excerpt: excerpt(value),
          },
        });
    }
  }

  // Class 5 + class 1: bracket shape, then pinyin.
  const orphans = orphanBrackets(value);
  for (const o of orphans) {
    if (o.inner.trim() === "") {
      file({
        ...base,
        class: "bracket_shape",
        detail: {
          severity: "empty_bracket",
          bracket: o.raw,
          excerpt: excerpt(value),
        },
      });
      continue;
    }
    // Only report an orphan when it looks like a reading annotation, so
    // ordinary square brackets in prose are not swept up.
    const looksLikeReading =
      /[Ā-ſƠ-ǿ぀-ヿ]/.test(o.inner) ||
      /^[a-zA-ZÀ-ɏ\s'̀-ͯ.,!?。，]+$/.test(o.inner);
    if (!looksLikeReading) continue;
    file({
      ...base,
      class: "bracket_shape",
      detail: {
        severity: "unpaired_bracket",
        systemic: true,
        bracket: excerpt(o.raw),
        reason:
          "no CJK token immediately precedes the bracket, so Furigana renders it literally",
        excerpt: excerpt(value),
      },
    });
  }

  const paired = pairedBrackets(value);
  for (const b of paired) {
    const hostChars = [...b.host].filter((c) => HAN.test(c)).length;
    const readingSyls = b.reading.trim().split(/\s+/).filter(Boolean).length;

    // Shape checks come first and take precedence: class 1 must not re-file a
    // defect that is really about which characters the bracket covers.
    // FURIGANA_RE takes the WHOLE preceding CJK run as the host, so
    // 我的腿[tuǐ] renders the ruby "tuǐ" over all three characters even though
    // the pinyin itself is correct for 腿.
    if (SENTENCE_PUNCT.test(b.reading) || readingSyls >= hostChars + 2) {
      file({
        ...base,
        class: "bracket_shape",
        detail: {
          severity: "sentence_in_one_bracket",
          systemic: true,
          host: excerpt(b.host),
          hostChars,
          readingSyllables: readingSyls,
          bracket: excerpt(b.raw),
        },
      });
      continue;
    }
    // A spaced reading with more tokens than the host has characters is a
    // sentence crammed onto a short host (房间[gāngānjìngjìng de fángjiān]).
    if (readingSyls > hostChars) {
      file({
        ...base,
        class: "bracket_shape",
        detail: {
          severity: "sentence_in_one_bracket",
          systemic: true,
          host: excerpt(b.host),
          hostChars,
          readingSyllables: readingSyls,
          bracket: excerpt(b.raw),
        },
      });
      continue;
    }

    if (!ctx.pinyin) continue;

    // Class 1 judges word-scale hosts only. The reading table is built from
    // word/reading pairs; on a sentence-length host a single word-boundary
    // neutralization or table gap kills the whole satisfiability search and
    // produces a finding about the wrong thing. Over-long hosts are already
    // reported above as a shape defect.
    if (hostChars > MAX_PINYIN_HOST_CHARS) {
      class1Skips.sentence_host = (class1Skips.sentence_host ?? 0) + 1;
      continue;
    }

    const res = checkBracket(b.host, b.reading, readingTable);
    if (res.reason === "host_overcapture") {
      class1Skips.host_overcapture = (class1Skips.host_overcapture ?? 0) + 1;
      file({
        ...base,
        class: "bracket_shape",
        detail: {
          severity: "bracket_overcovers_host",
          systemic: true,
          host: excerpt(b.host),
          reading: excerpt(b.reading),
          coveredSuffix: res.coveredSuffix,
          extraPrefix: res.extraPrefix,
          reason:
            "the reading is correct for the host's final word, but Furigana pairs the bracket with the whole preceding CJK run, so the ruby is drawn over the extra characters too",
          excerpt: excerpt(value),
        },
      });
      continue;
    }
    if (res.ok === null) {
      class1Skips[res.reason] = (class1Skips[res.reason] ?? 0) + 1;
      continue;
    }
    class1Skips.checked++;
    if (res.ok === false) {
      // Attribute the failure to the host as a whole; crediting every
      // character would make the commonest characters top any histogram
      // regardless of what actually broke.
      class1FailChars.set(b.host, (class1FailChars.get(b.host) ?? 0) + 1);
      file({
        ...base,
        class: "pinyin_mismatch",
        detail: {
          severity: res.severity,
          // The reading table is built from word-level readings, so it
          // under-covers neutral-tone variants and polyphones (个 ge, 告诉
          // gàosu, 只 zhī). Those surface as `tone_only`, which is therefore
          // low confidence; `syllable_mismatch` means a genuinely different
          // syllable was written (漫画 mànghuà) and is the reliable class.
          confidence: res.severity === "syllable_mismatch" ? "high" : "low",
          systemic: res.severity === "tone_only",
          host: b.host,
          reading: b.reading,
          expected: res.expected,
          excerpt: excerpt(value),
        },
      });
    }
  }
}

/** Parse a content column into its {tr, en} halves. */
function parseContent(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return "invalid";
  }
}

const flaggedBefore = () => findings.length;

// --- zh vocab ---------------------------------------------------------------

const vocabRows = db
  .prepare(
    "select id, target_language, word, level, reading, traditional, content from vocab_entries where content is not null"
  )
  .all();

for (const row of vocabRows) {
  const surface = `vocab-${row.target_language}`;
  const s = bump(surface);
  s.rows++;
  const ctx = {
    table: "vocab_entries",
    cjk: row.target_language === "zh" || row.target_language === "ja",
    pinyin: row.target_language === "zh",
  };
  const item = { id: row.id, key: row.word };
  const content = parseContent(row.content);
  if (content === "invalid") {
    file({
      surface,
      table: "vocab_entries",
      id: row.id,
      key: row.word,
      lang: null,
      path: "$",
      class: "markup_leak",
      detail: { pattern: "unparseable_json", excerpt: excerpt(row.content) },
    });
    continue;
  }
  if (!content) continue;

  const start = flaggedBefore();
  for (const lang of ["tr", "en"]) {
    const half = content[lang];
    if (!half) continue;
    for (const { path: p, value } of walkStrings(half, "$"))
      checkString(item, surface, lang, p, value, ctx);

    // Class 2: headword containment in examples and collocations.
    if (row.target_language !== "zh") continue;
    const forms = [row.word, row.traditional].filter(Boolean);
    const contains = (text) => {
      const bare = stripBrackets(text);
      return forms.some((f) => bare.includes(f));
    };
    const charsPresentInOrder = (text) => {
      const bare = stripBrackets(text);
      let at = 0;
      for (const c of [...row.word]) {
        const i = bare.indexOf(c, at);
        if (i < 0) return false;
        at = i + 1;
      }
      return true;
    };
    for (const [field, arr, textKey] of [
      ["examples", half.examples, "sentence"],
      ["collocations", half.collocations, "phrase"],
    ]) {
      if (!Array.isArray(arr) || !arr.length) continue;
      const missing = [];
      for (let i = 0; i < arr.length; i++) {
        const text = arr[i]?.[textKey];
        if (typeof text !== "string") continue;
        if (!contains(text)) missing.push({ index: i, text: excerpt(text) });
      }
      if (missing.length)
        file({
          surface,
          table: "vocab_entries",
          id: row.id,
          key: row.word,
          lang,
          path: `$.${field}`,
          class: "headword_missing",
          detail: {
            headword: row.word,
            missing: missing.length,
            total: arr.length,
            allMissing: missing.length === arr.length,
            charsPresentInOrder: missing.every((m) =>
              charsPresentInOrder(m.text)
            ),
            items: missing.slice(0, 6),
          },
        });
    }
  }
  if (findings.length > start) s.flaggedItems.add(row.word);
}

// --- ja kanji ---------------------------------------------------------------

const kanjiRows = db
  .prepare(
    "select id, target_language, char, level, onyomi, kunyomi, content from kanji_entries where content is not null"
  )
  .all();

for (const row of kanjiRows) {
  const surface = `kanji-${row.target_language}`;
  const s = bump(surface);
  s.rows++;
  // Kanji is a subset of hanzi code points, so the zh reading table must never
  // judge a ja bracket: pinyin checking stays off for this surface.
  const ctx = { table: "kanji_entries", cjk: true, pinyin: false };
  const item = { id: row.id, key: row.char };
  const content = parseContent(row.content);
  if (content === "invalid") {
    file({
      surface,
      table: "kanji_entries",
      id: row.id,
      key: row.char,
      lang: null,
      path: "$",
      class: "markup_leak",
      detail: { pattern: "unparseable_json", excerpt: excerpt(row.content) },
    });
    continue;
  }
  if (!content) continue;

  const start = flaggedBefore();
  for (const lang of ["tr", "en"]) {
    const half = content[lang];
    if (!half) continue;
    for (const { path: p, value } of walkStrings(half, "$"))
      checkString(item, surface, lang, p, value, ctx);

    // Class 2: every example word must actually contain the character taught.
    const arr = half.examples;
    if (!Array.isArray(arr) || !arr.length) continue;
    const missing = [];
    for (let i = 0; i < arr.length; i++) {
      const w = arr[i]?.word;
      if (typeof w !== "string") continue;
      if (!stripBrackets(w).includes(row.char))
        missing.push({ index: i, text: excerpt(w) });
    }
    if (missing.length)
      file({
        surface,
        table: "kanji_entries",
        id: row.id,
        key: row.char,
        lang,
        path: "$.examples",
        class: "headword_missing",
        detail: {
          headword: row.char,
          missing: missing.length,
          total: arr.length,
          allMissing: missing.length === arr.length,
          items: missing.slice(0, 6),
        },
      });
  }
  if (findings.length > start) s.flaggedItems.add(row.char);
}

// --- grammar ----------------------------------------------------------------

const grammarRows = db
  .prepare(
    "select id, target_language, slug, level, content from grammar_topics where content is not null"
  )
  .all();

for (const row of grammarRows) {
  const surface = `grammar-${row.target_language}`;
  const s = bump(surface);
  s.rows++;
  const ctx = {
    table: "grammar_topics",
    cjk: row.target_language === "ja" || row.target_language === "zh",
    pinyin: row.target_language === "zh",
  };
  const item = { id: row.id, key: row.slug };
  const content = parseContent(row.content);
  if (content === "invalid") {
    file({
      surface,
      table: "grammar_topics",
      id: row.id,
      key: row.slug,
      lang: null,
      path: "$",
      class: "markup_leak",
      detail: { pattern: "unparseable_json", excerpt: excerpt(row.content) },
    });
    continue;
  }
  if (!content) continue;

  const start = flaggedBefore();
  for (const lang of ["tr", "en"]) {
    const half = content[lang];
    if (!half) continue;
    for (const { path: p, value } of walkStrings(half, "$"))
      checkString(item, surface, lang, p, value, ctx);
  }
  if (findings.length > start) s.flaggedItems.add(row.slug);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const CLASS_ORDER = [
  "pinyin_mismatch",
  "headword_missing",
  "markup_leak",
  "script_contamination",
  "bracket_shape",
  "em_dash",
];

findings.sort((a, b) => {
  const k = (f) =>
    [
      f.table,
      f.key,
      f.lang ?? "",
      f.path,
      String(CLASS_ORDER.indexOf(f.class)),
    ].join(" ");
  return k(a) < k(b) ? -1 : k(a) > k(b) ? 1 : 0;
});

const byClass = {};
for (const c of CLASS_ORDER) byClass[c] = 0;
for (const f of findings) byClass[f.class] = (byClass[f.class] ?? 0) + 1;

/**
 * Systemic findings are real defects but describe a pipeline-wide convention
 * (a bracket style applied corpus-wide, the em dash the prompts emit), so they
 * are fixed once at the generator rather than row by row. Actionable findings
 * are the per-item work list T-091 works through.
 */
const isSystemic = (f) => f.detail?.systemic === true;
const actionable = findings.filter((f) => !isSystemic(f));
const systemic = findings.filter(isSystemic);
const byClassActionable = {};
for (const c of CLASS_ORDER) byClassActionable[c] = 0;
for (const f of actionable) byClassActionable[f.class]++;
const systemicBySeverity = {};
for (const f of systemic) {
  const k = `${f.class}:${f.detail.severity ?? "n/a"}`;
  systemicBySeverity[k] = (systemicBySeverity[k] ?? 0) + 1;
}
const bySeverity = {};
for (const f of findings) {
  const k = `${f.class}:${f.detail?.severity ?? f.detail?.script ?? f.detail?.pattern ?? "n/a"}`;
  bySeverity[k] = (bySeverity[k] ?? 0) + 1;
}

const perSurface = {};
for (const [name, s] of [...surfaceStats.entries()].sort()) {
  const classes = {};
  for (const c of CLASS_ORDER) classes[c] = 0;
  for (const f of findings) if (f.surface === name) classes[f.class]++;
  const items = new Set(findings.filter((f) => f.surface === name).map((f) => f.key));
  const act = actionable.filter((f) => f.surface === name);
  const actItems = new Set(act.map((f) => f.key));
  perSurface[name] = {
    rowsScanned: s.rows,
    flaggedItems: items.size,
    flaggedItemRate: s.rows ? Number((items.size / s.rows).toFixed(4)) : 0,
    actionableItems: actItems.size,
    actionableItemRate: s.rows ? Number((actItems.size / s.rows).toFixed(4)) : 0,
    findings: Object.values(classes).reduce((a, b) => a + b, 0),
    actionableFindings: act.length,
    classes,
  };
}

const dbStat = (await import("node:fs")).statSync(dbPath);
const topFailChars = [...class1FailChars.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([c, n]) => `${c}:${n}`);

const meta = {
  ticket: "T-087",
  generatedAt: new Date().toISOString(),
  snapshot: {
    path: dbPath,
    mtime: dbStat.mtime.toISOString(),
    bytes: dbStat.size,
  },
  readingTable: {
    charsCovered: readingTable.size,
    rowsUsed: tableStats.rowsUsed,
    rowsDroppedForLengthMismatch: tableStats.rowsDropped,
    sandhiExceptions: ["yi 1/2/4", "bu 2/4", "er r0/er2"],
  },
  class1Coverage: {
    bracketsChecked: class1Skips.checked,
    skippedUnknownChar: class1Skips.unknown_char ?? 0,
    skippedNonHanHost: class1Skips.non_han_host ?? 0,
    skippedEmptyReading: class1Skips.empty_reading ?? 0,
    skippedSentenceHost: class1Skips.sentence_host ?? 0,
    maxHostChars: MAX_PINYIN_HOST_CHARS,
    topFailingHosts: topFailChars,
  },
  classes: {
    pinyin_mismatch:
      "bracket pinyin no per-character reading choice can spell (severity tone_only vs syllable_mismatch)",
    headword_missing:
      "example sentence or collocation that does not contain the item it teaches",
    markup_leak: "generation markup (<parameter, </tag, <function) inside content",
    script_contamination:
      "foreign-script letters in content, or latin words inside CJK target text",
    bracket_shape:
      "brackets the Furigana renderer cannot pair, empty brackets, or a whole sentence in one bracket",
    em_dash: "U+2014, banned by AGENTS.md",
  },
  notScanned: [
    "vocab_entries rows with null content (ja vocab is not generated)",
    "lessons, exercises, translations, chat_messages (out of ticket scope)",
    "static conjugation tables in src/lib/conjugation (code, covered by T-086)",
  ],
  totals: {
    findings: findings.length,
    actionable: actionable.length,
    systemic: systemic.length,
    byClass,
    byClassActionable,
    bySeverity,
    systemicBySeverity,
  },
  perSurface,
};

writeFileSync(jsonOut, JSON.stringify({ meta, findings }, null, 1));

// --- human summary ----------------------------------------------------------

const pct = (n, d) => (d ? ((n / d) * 100).toFixed(1) + "%" : "n/a");
const lines = [];
lines.push("# T-087 mechanical content validator: summary");
lines.push("");
lines.push(
  `Generated ${meta.generatedAt} from \`${dbPath}\` (snapshot mtime ${meta.snapshot.mtime}).`
);
lines.push(
  "Read-only sweep; the validator opens the DB with `readonly: true` and changes nothing."
);
lines.push(
  `Machine-readable work list: \`${jsonOut}\` (${findings.length} findings).`
);
lines.push("");
lines.push(
  "Findings split into **actionable** (a per-item defect T-091 fixes row by row) and " +
    "**systemic** (a real defect that describes a corpus-wide generation convention, so it is " +
    "fixed once in the prompt or renderer, not 10k times in the data). Both are kept per item " +
    "in the JSON; the split is a triage aid, not a severity claim."
);
lines.push("");
lines.push("## Findings by class");
lines.push("");
lines.push("| Class | Actionable | Systemic | Total |");
lines.push("| --- | --- | --- | --- |");
for (const c of CLASS_ORDER)
  lines.push(
    `| ${c} | ${byClassActionable[c]} | ${byClass[c] - byClassActionable[c]} | ${byClass[c]} |`
  );
lines.push(
  `| **total** | **${actionable.length}** | **${systemic.length}** | **${findings.length}** |`
);
lines.push("");
lines.push("### By severity");
lines.push("");
lines.push("| Class and severity | Findings |");
lines.push("| --- | --- |");
for (const [k, v] of Object.entries(bySeverity).sort((a, b) => b[1] - a[1]))
  lines.push(`| ${k} | ${v} |`);
lines.push("");
lines.push("## Findings by surface");
lines.push("");
lines.push(
  "| Surface | Rows scanned | Items w/ any finding | Rate | Items w/ actionable | Rate | " +
    CLASS_ORDER.join(" | ") +
    " |"
);
lines.push(
  "| --- | --- | --- | --- | --- | --- | " +
    CLASS_ORDER.map(() => "---").join(" | ") +
    " |"
);
for (const [name, s] of Object.entries(perSurface))
  lines.push(
    `| ${name} | ${s.rowsScanned} | ${s.flaggedItems} | ${pct(
      s.flaggedItems,
      s.rowsScanned
    )} | ${s.actionableItems} | ${pct(s.actionableItems, s.rowsScanned)} | ` +
      CLASS_ORDER.map((c) => s.classes[c]).join(" | ") +
      " |"
  );
lines.push("");
lines.push("## Class 1 coverage");
lines.push("");
lines.push(
  `Reading table: ${readingTable.size} characters from ${tableStats.rowsUsed} aligned word/reading pairs ` +
    `(${tableStats.rowsDropped} rows dropped for a character/syllable count mismatch), plus tone-sandhi ` +
    "exceptions for yi, bu and erhua so standard orthography is not flagged."
);
lines.push("");
lines.push(
  `Brackets judged: ${class1Skips.checked}. Skipped: ${
    class1Skips.unknown_char ?? 0
  } for an out-of-table character, ${
    class1Skips.sentence_host ?? 0
  } for a host longer than ${MAX_PINYIN_HOST_CHARS} characters, ${
    class1Skips.non_han_host ?? 0
  } for a non-hanzi host, ${class1Skips.empty_reading ?? 0} for an empty reading. ` +
    `Unknown-character skip rate: ${pct(
      class1Skips.unknown_char ?? 0,
      (class1Skips.unknown_char ?? 0) + class1Skips.checked
    )}.`
);
lines.push("");
lines.push(
  "The host-length gate matters because `FURIGANA_RE` takes the WHOLE preceding CJK run as a " +
    "bracket's host, so `我的腿[tuǐ]` yields the host 我的腿 even though the pinyin is correct " +
    "for 腿 alone. On sentence-length hosts a single word-boundary neutralization defeats the " +
    "reading search and the finding would describe the wrong thing; those brackets are reported " +
    "under `bracket_shape` instead, which is what they actually are."
);
lines.push("");
lines.push(`Top failing hosts: ${topFailChars.join(", ") || "none"}.`);
lines.push("");
lines.push("## Systemic patterns");
lines.push("");
lines.push(
  "These are real defects, but each describes one generation convention applied across the " +
    "corpus, so the fix belongs in the prompt or the renderer rather than in per-row edits."
);
lines.push("");
lines.push("| Pattern | Findings |");
lines.push("| --- | --- |");
for (const [k, v] of Object.entries(systemicBySeverity).sort((a, b) => b[1] - a[1]))
  lines.push(`| ${k} | ${v} |`);
lines.push("");
lines.push(
  "- `bracket_shape:unpaired_bracket` is the dominant one: the pipeline appends a whole-sentence " +
    "reading after the sentence's final punctuation (`...。[Pinyin]`). Because the renderer pairs a " +
    "bracket only with an immediately preceding CJK token, U+3002 and friends break the pairing and " +
    "the bracket is shown to the learner as literal text. Grammar examples already carry a dedicated " +
    "`reading` field that `GrammarTopicView` renders on its own line, so the inline copy is redundant " +
    "as well as broken."
);
lines.push(
  "- `em_dash` is the AGENTS.md ban. The bulk sits in `vocab-zh $.chars[].hint_tr` and the grammar " +
    "table rows, that is, in prompt-shaped prose, so it is a prompt fix plus one sweep."
);
lines.push(
  "- `pinyin_mismatch:tone_only` is grouped here because the reading table is built from word-level " +
    "readings and therefore under-covers neutral-tone variants and polyphones; 个 written `ge`, 告诉 " +
    "written `gàosu` and 只 written `zhī` are all correct pinyin the table cannot confirm. Treat " +
    "`syllable_mismatch` (marked `confidence: high`) as the reliable pinyin work list; a genuinely " +
    "dropped tone does land in `tone_only`, so the bucket is worth spot-checking but not worth " +
    "fixing wholesale."
);
lines.push("");
lines.push("## Not scanned");
lines.push("");
for (const n of meta.notScanned) lines.push(`- ${n}`);
lines.push("");
writeFileSync(mdOut, lines.join("\n"));

console.log(`findings: ${findings.length}`);
console.log(JSON.stringify(byClass, null, 1));
console.log(JSON.stringify(perSurface, null, 1));
console.log(JSON.stringify(meta.class1Coverage, null, 1));
