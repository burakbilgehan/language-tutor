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

// --- proper-noun signal (T-029: name senses must not lead the gloss list) ----
const NAME_MISC = new Set([
  "surname", "place", "given", "person", "company", "product",
  "work", "organization", "unclass", "ship",
]);
const isNameSense = (s) =>
  (s.partOfSpeech ?? []).includes("n-pr") ||
  (s.misc ?? []).some((m) => NAME_MISC.has(m));

// --- unwanted-sense signal --------------------------------------------------
// A sense is dropped entirely when tagged vulgar/X-rated (JMdict `vulg`; the
// legacy `X` tag maps to `vulg` in jmdict-simplified but we match both) or
// archaic (`arch`). These are the 出る→"to cum" / rare-classical-reading walls.
const DROP_MISC = new Set(["vulg", "X", "arch"]);
// Gloss-level denylist: some crude senses of otherwise-innocent common words
// are only `col`-tagged, not `vulg` (息子 "son" carries a col-tagged "penis"
// sense). Dropping ALL `col` would strip 2466 benign colloquial senses, so
// instead drop a sense when any of its glosses word-boundary-matches this small
// explicit crude set — a deliberate supplement to the tag filter, faithful to
// "drop crude senses like the cum one" without over-culling. distillGlosses
// falls back to the raw first sense if everything drops, so a genuine anatomy
// entry can never vanish; only secondary slang senses get culled.
const CRUDE_GLOSS =
  /\b(cum|penis|vagina|dick|cunt|pussy|semen|masturbat\w*|whore|slut|blowjob|jizz|boner|scrotum|testicle)\b/i;
const isDroppableSense = (s) =>
  (s.misc ?? []).some((m) => DROP_MISC.has(m)) ||
  (s.gloss ?? []).some((g) => g.text && CRUDE_GLOSS.test(g.text));

// A word is "usually written in kana" (JMdict `uk`) when its LEADING non-name
// sense carries the tag — `uk` is a sense-level misc tag, not a reading
// property. Such words get a kana headword (為る→する) so the dictionary shows
// the form learners actually read/write.
const leadSense = (entry) => {
  const senses = entry.sense ?? [];
  return senses.find((s) => !isNameSense(s)) ?? senses[0];
};
const isUsuallyKana = (entry) => {
  const s = leadSense(entry);
  return !!s && (s.misc ?? []).includes("uk");
};

// Sense-aware gloss distillation. Replaces the old lossless union of ALL
// glosses of ALL senses (為る showed ~76 glosses). Take glosses in JMdict
// sense order — first ~3 usable senses, first 2 glosses each — dropped-sense
// filtered, deduped, capped at CAP total. Name senses are pushed last so a
// proper-noun sense never heads a common word; the cap makes that a no-op for
// ordinary words. Falls back to the unfiltered first sense if filtering would
// leave an entry with zero glosses (keeps a legit JLPT word from vanishing).
const GLOSS_CAP = 5;
const SENSE_CAP = 3;
const GLOSS_PER_SENSE = 2;
function distillGlosses(entry) {
  const senses = [...(entry.sense ?? [])].sort(
    (a, b) => Number(isNameSense(a)) - Number(isNameSense(b)),
  );
  const usable = senses.filter((s) => !isDroppableSense(s));
  const pick = (pool) => {
    const en = [];
    for (const s of pool.slice(0, SENSE_CAP)) {
      let taken = 0;
      for (const g of s.gloss ?? []) {
        if (!g.text || en.includes(g.text)) continue;
        en.push(g.text);
        if (++taken >= GLOSS_PER_SENSE) break;
        if (en.length >= GLOSS_CAP) break;
      }
      if (en.length >= GLOSS_CAP) break;
    }
    return en;
  };
  let en = pick(usable);
  // All senses were droppable (e.g. an archaic-only entry) → fall back to the
  // raw first sense so the row still carries a gloss.
  if (en.length === 0) en = pick(senses);
  return en.slice(0, GLOSS_CAP);
}

// Tanos level number → JLPT label. Tanos numbers run OPPOSITE to difficulty
// ascending: 5 = N5 (easiest), 1 = N1 (hardest). "Easiest wins" when a word
// spans levels therefore means the MAX Tanos number (not min, as in zh/HSK).
const jlptLabel = (n) => `N${n}`;

// --- group JLPT keys by the JMdict entry they resolve to --------------------
// Multiple JLPT keys collapse onto one JMdict entry (馬 and うま → id 1471560,
// sometimes at different levels). One output row per entry id: kanji (or, for
// usually-kana words, kana) surface as `word`, the joined kana as `reading`,
// the SENSE-AWARE distilled glosses (≤5, that entry's own senses only) as
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

  // Displayed word. Usually-kana entries (JMdict `uk`) show the kana form
  // learners actually read/write (為る→する, 遣る→やる); the kanji surface is
  // NOT stored in any DB field, so it isn't independently searchable in the
  // sidebar — documented v1 limitation (no schema change permitted). All other
  // entries prefer a kanji-bearing JLPT key surface; else the entry's first
  // common kanji; else the kana key (kana-only words: ある, きれい...).
  let word;
  if (isUsuallyKana(entry)) {
    word = reading;
  } else {
    const kanjiKey = keys.find((k) => !KANA_ONLY.test(k.surface));
    if (kanjiKey) word = kanjiKey.surface;
    else {
      const commonKanji = (entry.kanji ?? []).find((k) => k.common);
      word = commonKanji?.text ?? entry.kanji?.[0]?.text ?? keys[0].surface;
    }
  }

  // Sense-aware distilled glosses — this entry's own senses only (NO
  // cross-entry union), vulgar/archaic senses dropped, ≤5 total.
  const en = distillGlosses(entry);
  if (en.length === 0) continue; // no English gloss → useless as a dict entry

  // Is the reading we display JMdict-flagged as a common form? Used to break
  // equal-level surface collisions toward the frequent reading (私→わたし over
  // わたくし) rather than an arbitrary gloss-count tie.
  const commonReading = (entry.kana ?? []).some(
    (k) => k.text === reading && k.common,
  );

  rows.push({
    word,
    reading,
    en,
    level: jlptLabel(tanos),
    _tanos: tanos,
    _common: commonReading,
  });
}

// One row per surface. Different JMdict entries can carry the same written
// form (入る=はいる vs いる; 日=ひ vs にち) and, after the uk→kana headword
// step, distinct kanji entries can collapse onto one kana head (為る/掏る/擦る
// all → する). The DB keys vocab_entries on (targetLanguage, word) UNIQUE, so a
// surface must appear once. We PICK ONE entry — the easiest level (max Tanos),
// tie-broken by more glosses then lower entry order — and DROP the loser. We do
// NOT union glosses across entries: cross-entry union is exactly what made
// 日(ひ)'s headline "Sunday" (leaked from the 日/にち entry) and する show a
// pickpocket sense. v1 limitation: a surface's non-primary reading and its
// distinct glosses are not represented — the primary (easiest-level) entry wins
// wholesale. Dropped losers are counted for the build report.
// Winner order: easier level (higher Tanos) first; then the JMdict-common
// reading (私→わたし beats わたくし); then more glosses; all deterministic.
const better = (a, b) =>
  a._tanos !== b._tanos
    ? a._tanos - b._tanos
    : a._common !== b._common
      ? Number(a._common) - Number(b._common)
      : a.en.length - b.en.length;
const bySurface = new Map();
let droppedCollisions = 0;
const droppedExamples = [];
for (const r of rows) {
  const prev = bySurface.get(r.word);
  if (!prev) {
    bySurface.set(r.word, r);
    continue;
  }
  const loser = better(r, prev) > 0 ? prev : r;
  const winner = loser === prev ? r : prev;
  if (droppedExamples.length < 15)
    droppedExamples.push(
      `${r.word}: kept ${winner.reading}(${winner.level}), dropped ${loser.reading}(${loser.level})`,
    );
  bySurface.set(r.word, winner);
  droppedCollisions++;
}
const merged = [...bySurface.values()];

// Level-major (N5 → N1 = Tanos 5 → 1); within a level keep a stable order.
// Glosses are now capped at 5 so gloss-count is no longer a useful frequency
// proxy — fall back to surface for a deterministic, reproducible order.
const N_ORDER = { N5: 0, N4: 1, N3: 2, N2: 3, N1: 4 };
merged.sort(
  (a, b) =>
    N_ORDER[a.level] - N_ORDER[b.level] ||
    a.word.localeCompare(b.word, "ja"),
);
for (const r of merged) {
  delete r._tanos;
  delete r._common;
}

writeFileSync(OUT, JSON.stringify(merged));
const perLevel = merged.reduce((m, r) => {
  m[r.level] = (m[r.level] ?? 0) + 1;
  return m;
}, {});
console.log(`wrote ${merged.length} entries to ${OUT}`);
console.log(`dropped ${misses} JLPT forms with no JMdict match`);
console.log(
  `dropped ${droppedCollisions} same-surface collisions (pick-one, not unioned)`,
);
if (droppedExamples.length)
  console.log("  e.g.", droppedExamples.join(" | "));
console.log(perLevel);
