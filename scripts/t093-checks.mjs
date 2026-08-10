// T-093: per-item defect verification helpers for the targeted LLM regen leg.
// These are ports of the pure checking functions in validate-content.mjs
// (which runs a top-level sweep on import, so it cannot be imported as a
// library without a refactor this ticket does not want to risk). Keep the
// two in sync if the validator's rules ever change.

const TONE_MARKS = { "̄": 1, "́": 2, "̌": 3, "̀": 4 };
const COMBINING = /[̀-ͯ]/;
export const HAN = /[一-鿿㐀-䶿]/;

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
  }
  return { letters: letters.join(""), marks };
}

/** Build char -> Set("base:tone") from word/reading pairs (the same two
 * sources the validator uses: vocab_entries.reading + the HSK index). */
export function buildReadingTable(pairs) {
  const table = new Map();
  const add = (ch, base, tone) => {
    if (!base) return;
    if (!table.has(ch)) table.set(ch, new Set());
    table.get(ch).add(`${base}:${tone}`);
  };
  for (const { word, reading } of pairs) {
    if (!word || !reading) continue;
    const chars = [...String(word)];
    const syls = String(reading).trim().split(/\s+/).filter(Boolean);
    if (chars.length !== syls.length) continue;
    for (let i = 0; i < chars.length; i++) {
      if (!HAN.test(chars[i])) continue;
      const { base, tone } = normSyllable(syls[i]);
      add(chars[i], base, tone);
    }
  }
  add("一", "yi", 1);
  add("一", "yi", 2);
  add("一", "yi", 4);
  add("不", "bu", 2);
  add("不", "bu", 4);
  add("儿", "r", 0);
  add("儿", "er", 2);
  return table;
}

/** Same satisfiability search as the validator's checkBracket. */
export function checkBracket(word, bracket, table) {
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

  for (let k = 1; k < chars.length; k++) {
    memo = new Set();
    if (walk(k, 0)) return { ok: null, reason: "host_overcapture" };
  }
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
  return { ok: false, severity: tonelessOk ? "tone_only" : "syllable_mismatch" };
}

// Bracket parsing, mirrors src/lib/jp.ts FURIGANA_RE.
export const FURIGANA_RE = /([一-鿿々-〇]+[ぁ-ゟ]*)\[([^\]]+)\]/g;
const ANY_BRACKET_RE = /\[([^\]]*)\]/g;

export const stripBrackets = (text) =>
  String(text).replace(FURIGANA_RE, "$1").replace(ANY_BRACKET_RE, "");

export function pairedBrackets(text) {
  const out = [];
  for (const m of String(text).matchAll(FURIGANA_RE))
    out.push({ host: m[1], reading: m[2] });
  return out;
}

export const FOREIGN_SCRIPTS = [
  ["cyrillic", /[Ѐ-ӿ]/],
  ["hangul", /[가-힯ᄀ-ᇿ㄰-㆏]/],
  ["greek", /[Ͱ-Ͽ]/],
  ["arabic", /[؀-ۿ]/],
  ["hebrew", /[֐-׿]/],
  ["devanagari", /[ऀ-ॿ]/],
  ["thai", /[฀-๿]/],
  ["armenian", /[԰-֏]/],
  ["georgian", /[Ⴀ-ჿ]/],
];

export function* walkStrings(node, prefix = "$") {
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

const MAX_PINYIN_HOST_CHARS = 4;

/**
 * Verify one regenerated content half against the T-093 target classes.
 * `opts.classes` is a Set of "headword" | "foreign" | "pinyin".
 * Returns { pass, problems: string[] }.
 */
export function verifyHalf(half, opts) {
  const problems = [];
  if (!half) return { pass: false, problems: ["half missing after regen"] };

  if (opts.classes.has("foreign")) {
    outer: for (const { path, value } of walkStrings(half)) {
      for (const [name, re] of FOREIGN_SCRIPTS) {
        if (re.test(value)) {
          problems.push(`foreign_script ${name} at ${path}: ${value.slice(0, 80)}`);
          break outer;
        }
      }
    }
  }

  if (opts.classes.has("headword") && opts.headword) {
    const forms = [opts.headword.word, opts.headword.traditional].filter(Boolean);
    const contains = (t) => {
      const bare = stripBrackets(t);
      return forms.some((f) => bare.includes(f));
    };
    if (opts.headword.kind === "vocab") {
      for (const [field, key] of [
        ["examples", "sentence"],
        ["collocations", "phrase"],
      ]) {
        const arr = half[field];
        if (!Array.isArray(arr)) continue;
        arr.forEach((e, i) => {
          const t = e?.[key];
          if (typeof t === "string" && !contains(t))
            problems.push(`headword_missing ${field}[${i}]: ${t.slice(0, 80)}`);
        });
      }
    } else {
      const arr = half.examples;
      if (Array.isArray(arr))
        arr.forEach((e, i) => {
          const w = e?.word;
          if (typeof w === "string" && !stripBrackets(w).includes(opts.headword.word))
            problems.push(`headword_missing examples[${i}]: ${w.slice(0, 80)}`);
        });
    }
  }

  if (opts.classes.has("pinyin") && opts.readingTable) {
    for (const { path, value } of walkStrings(half)) {
      for (const b of pairedBrackets(value)) {
        const hostChars = [...b.host].filter((c) => HAN.test(c)).length;
        if (hostChars > MAX_PINYIN_HOST_CHARS) continue;
        if (b.reading.includes("/")) continue; // alternation notation, not a defect
        const res = checkBracket(b.host, b.reading, opts.readingTable);
        if (res.ok === false && res.severity === "syllable_mismatch")
          problems.push(`syllable_mismatch ${b.host}[${b.reading}] at ${path}`);
      }
    }
  }

  return { pass: problems.length === 0, problems };
}
