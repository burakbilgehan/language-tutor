// Distills a JLPT word list joined against JMdict into
// src/lib/vocab-index/ja-data.json (same shape as zh-data.json:
// word / reading(kana) / en[] / level).
//
// DATA SOURCES & LICENCES (attribution required — see the attribution page):
//   1. JLPT level list: word surface → JLPT level (N5..N1). Derived from
//      Jonathan Waller's tanos.co.uk JLPT lists, licenced Creative Commons
//      BY. Machine-readable conversion: github.com/Bluskyo/JLPT_Vocabulary
//      (conversion tooling MIT-licensed; the vocabulary data stays CC BY
//      Jonathan Waller). NOTE: the Tanos lists predate the 2010 4→5 level
//      reform; this "5-level" derivative interpolates N3 and may differ from
//      the modern official split. Levels are a study aid, not authoritative.
//   2. Readings + English glosses: JMdict, property of the Electronic
//      Dictionary Research and Development Group (EDRDG), used under
//      CC BY-SA 4.0 (https://www.edrdg.org/edrdg/licence.html). Pre-parsed
//      distribution: github.com/scriptin/jmdict-simplified (jmdict-eng).
//
// Usage:
//   node scripts/build-ja-vocab-index.mjs <jlpt_vocab.json> <jmdict-eng.json>
// Both inputs are large community files downloaded out-of-band (see the URLs
// above); they are NOT vendored — only the distilled ja-data.json is committed.

import { writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/lib/vocab-index/ja-data.json",
);

const jlptPath = process.argv[2];
const jmdictPath = process.argv[3];
if (!jlptPath || !jmdictPath) {
  console.error(
    "usage: node scripts/build-ja-vocab-index.mjs <jlpt_vocab.json> <jmdict-eng.json>",
  );
  process.exit(1);
}

const jlpt = JSON.parse(readFileSync(jlptPath, "utf8"));
const jmWords = JSON.parse(readFileSync(jmdictPath, "utf8")).words;

// --- JMdict surface indexes -------------------------------------------------
const byKanji = new Map();
const byKana = new Map();
for (const w of jmWords) {
  for (const k of w.kanji ?? []) {
    if (!byKanji.has(k.text)) byKanji.set(k.text, []);
    byKanji.get(k.text).push(w);
  }
  for (const k of w.kana ?? []) {
    if (!byKana.has(k.text)) byKana.set(k.text, []);
    byKana.get(k.text).push(w);
  }
}

// Join a JLPT (surface, reading) pair onto a single JMdict entry. Priority:
// kanji surface + matching reading > kanji surface (any reading) > the key or
// its reading as a kana-only word.
function findEntry(key, reading) {
  const kanji = byKanji.get(key);
  if (kanji) {
    for (const w of kanji)
      if ((w.kana ?? []).some((kn) => kn.text === reading)) return w;
    return kanji[0];
  }
  return (byKana.get(key) ?? byKana.get(reading) ?? [null])[0];
}

// --- proper-noun signal (T-029: name senses must not lead the gloss union) --
const NAME_MISC = new Set([
  "surname", "place", "given", "person", "company", "product",
  "work", "organization", "unclass", "ship",
]);
const isNameSense = (s) =>
  (s.partOfSpeech ?? []).includes("n-pr") ||
  (s.misc ?? []).some((m) => NAME_MISC.has(m));

// Tanos level number → JLPT label. Tanos numbers run OPPOSITE to difficulty
// ascending: 5 = N5 (easiest), 1 = N1 (hardest). "Easiest wins" when a word
// spans levels therefore means the MAX Tanos number (not min, as in zh/HSK).
const jlptLabel = (n) => `N${n}`;

// --- group JLPT keys by the JMdict entry they resolve to --------------------
// Multiple JLPT keys collapse onto one JMdict entry (馬 and うま → id 1471560,
// sometimes at different levels). One output row per entry id: preferred kanji
// surface as `word`, the joined kana as `reading`, lossless gloss union as
// `en`, easiest level across all collapsed keys.
const groups = new Map(); // id -> { entry, keys:[{surface,reading,level}] }
let misses = 0;
for (const [key, forms] of Object.entries(jlpt)) {
  for (const f of forms) {
    const entry = findEntry(key, f.reading);
    if (!entry) {
      misses++;
      continue;
    }
    if (!groups.has(entry.id)) groups.set(entry.id, { entry, keys: [] });
    groups.get(entry.id).keys.push({
      surface: key,
      reading: f.reading,
      level: f.level,
    });
  }
}

const KANA_ONLY = /^[぀-ヿ゛-ゟ゠-ヿー]+$/u;

const rows = [];
for (const { entry, keys } of groups.values()) {
  // Easiest level = highest Tanos number among the collapsed keys.
  const tanos = Math.max(...keys.map((k) => k.level));

  // Displayed word: prefer a kanji-bearing JLPT key surface; else the entry's
  // first common kanji; else the kana key (kana-only words: ある, きれい...).
  const kanjiKey = keys.find((k) => !KANA_ONLY.test(k.surface));
  let word;
  if (kanjiKey) word = kanjiKey.surface;
  else {
    const commonKanji = (entry.kanji ?? []).find((k) => k.common);
    word = commonKanji?.text ?? entry.kanji?.[0]?.text ?? keys[0].surface;
  }

  // Reading: the kana we joined on (level-relevant, guarantees the romaji
  // fold path), else the entry's first common kana.
  const joinedReading = keys.find((k) => !KANA_ONLY.test(k.surface))?.reading
    ?? keys[0].reading;
  const reading =
    (entry.kana ?? []).some((k) => k.text === joinedReading)
      ? joinedReading
      : (entry.kana ?? []).find((k) => k.common)?.text
        ?? entry.kana?.[0]?.text
        ?? joinedReading;

  // Lossless gloss union across all senses, name senses pushed to the end.
  const senses = [...(entry.sense ?? [])].sort(
    (a, b) => Number(isNameSense(a)) - Number(isNameSense(b)),
  );
  const en = [];
  for (const s of senses)
    for (const g of s.gloss ?? [])
      if (g.text && !en.includes(g.text)) en.push(g.text);
  if (en.length === 0) continue; // no English gloss → useless as a dict entry

  rows.push({ word, reading, en, level: jlptLabel(tanos), _tanos: tanos });
}

// Merge rows that share a surface. Different JMdict entries can carry the same
// written form (入る=はいる vs いる; 上=うえ/じょう/かみ) — but the DB keys
// vocab_entries on (targetLanguage, word) UNIQUE, so a surface must appear
// once. Fold them the T-029 way: keep the easiest level (max Tanos) and its
// reading as the displayed head, union every form's glosses losslessly.
// v1 limitation: alternate readings of a merged surface aren't independently
// searchable — only the easiest-level reading is stored.
const bySurface = new Map();
for (const r of rows) {
  const prev = bySurface.get(r.word);
  if (!prev) {
    bySurface.set(r.word, r);
    continue;
  }
  if (r._tanos > prev._tanos) {
    prev.reading = r.reading;
    prev._tanos = r._tanos;
    prev.level = r.level;
  }
  for (const g of r.en) if (!prev.en.includes(g)) prev.en.push(g);
}
const merged = [...bySurface.values()];

// Level-major (N5 → N1 = Tanos 5 → 1), then by gloss-count desc as a rough
// frequency proxy (JMdict has no frequency rank here); array order = position.
const N_ORDER = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };
merged.sort(
  (a, b) => N_ORDER[a.level] - N_ORDER[b.level] || b.en.length - a.en.length,
);
for (const r of merged) delete r._tanos;

writeFileSync(OUT, JSON.stringify(merged));
const perLevel = merged.reduce((m, r) => {
  m[r.level] = (m[r.level] ?? 0) + 1;
  return m;
}, {});
console.log(`wrote ${merged.length} entries to ${OUT}`);
console.log(`dropped ${misses} JLPT forms with no JMdict match`);
console.log(perLevel);
