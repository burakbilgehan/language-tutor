// Distills the open HSK vocabulary dataset into src/lib/vocab-index/zh-data.json.
//
// Source: https://github.com/drkameleon/complete-hsk-vocabulary (MIT).
// We keep only classic HSK 2.0 levels ("old-1".."old-6") to match the app's
// zh level scheme (HSK1..HSK6, src/lib/curriculum/levels.ts) — ~5000 words.
//
// Usage:
//   node scripts/build-vocab-index.mjs [path/to/complete.json]
// Without an argument the dataset is downloaded from GitHub.

import { writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_URL =
  "https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json";
const OUT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/lib/vocab-index/zh-data.json",
);

const SKIP_GLOSS = /^(variant of|old variant of|used in|see [^ ]+$)/i;

// Proper-noun forms carry capitalized pinyin in the dataset ("Mǎ" the
// surname vs "mǎ" the horse).
const isProperNoun = (f) => /^\p{Lu}/u.test(f.transcriptions?.pinyin ?? "");

// A pinyin transcription with no tone diacritic — the neutral-tone spelling
// particles are conventionally written with (吗→ma, 得→de, 了→le, 的→de).
const TONE_MARKS = /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/;
const isToneless = (f) => !TONE_MARKS.test(f.transcriptions?.pinyin ?? "");

async function loadDataset() {
  const localPath = process.argv[2];
  if (localPath) return JSON.parse(readFileSync(localPath, "utf8"));
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  return res.json();
}

const data = await loadDataset();

const rows = [];
for (const entry of data) {
  const oldLevels = entry.level
    .filter((l) => l.startsWith("old-"))
    .map((l) => Number(l.slice(4)));
  if (oldLevels.length === 0) continue;
  const level = Math.min(...oldLevels);

  // Entries can carry several forms (马: Mǎ the surname + mǎ the horse; 骑:
  // qí to-ride + jì literary). The primary form — shown reading + leading
  // glosses — is the non-proper-noun form with the most glosses; every other
  // form's glosses are appended (lossless union) so a search on ANY meaning
  // finds the word. (T-029: first-form-wins used to make 马 read "surname Ma"
  // and hid it from "horse".)
  //
  // Exception (T-033): particles/interjections (吗/得/了/着/吧/呢/的/...) carry
  // a toneless "neutral tone" form ALONGSIDE a toned reading-form that
  // happens to have more glosses (得 dé "to obtain" has 12 meanings vs de's
  // 1) — pickMost would show the toned reading as primary, which is wrong
  // for how these words are actually taught/used (得→de, not dé). When a
  // toneless form exists among the common candidates, it wins regardless of
  // gloss count.
  const withMeanings = entry.forms.filter((f) => f.meanings?.length > 0);
  if (withMeanings.length === 0) continue;
  const common = withMeanings.filter((f) => !isProperNoun(f));
  const pickMost = (fs) =>
    fs.reduce((a, b) => (b.meanings.length > a.meanings.length ? b : a));
  const tonelessCommon = common.filter(isToneless);
  const form =
    tonelessCommon.length > 0
      ? pickMost(tonelessCommon)
      : common.length > 0
        ? pickMost(common)
        : pickMost(withMeanings);

  const en = [];
  for (const f of [form, ...withMeanings.filter((f) => f !== form)]) {
    for (const m of f.meanings) {
      if (SKIP_GLOSS.test(m) || en.includes(m)) continue;
      en.push(m);
    }
  }
  if (en.length === 0) en.push(...form.meanings);

  const row = {
    word: entry.simplified,
    reading: form.transcriptions.pinyin,
    en,
    level: `HSK${level}`,
    freq: entry.frequency ?? 999999,
  };
  if (form.traditional && form.traditional !== entry.simplified)
    row.trad = form.traditional;
  const cls = [
    ...new Set(withMeanings.flatMap((f) => f.classifiers ?? [])),
  ];
  if (cls.length > 0) row.cls = cls;
  if (entry.pos?.length > 0) row.pos = entry.pos;
  rows.push(row);
}

// Level-major, most frequent first inside a level; array order = position.
rows.sort(
  (a, b) => a.level.localeCompare(b.level) || a.freq - b.freq,
);
for (const r of rows) delete r.freq;

writeFileSync(OUT, JSON.stringify(rows));
const perLevel = rows.reduce((m, r) => {
  m[r.level] = (m[r.level] ?? 0) + 1;
  return m;
}, {});
console.log(`wrote ${rows.length} entries to ${OUT}`);
console.log(perLevel);
