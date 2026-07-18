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

const MAX_GLOSSES = 4;
const SKIP_GLOSS = /^(variant of|old variant of|used in|see [^ ]+$)/i;

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

  // Some entries carry several forms (rare pronunciation variants); take the
  // first one that actually has glosses.
  const form =
    entry.forms.find((f) => f.meanings?.length > 0) ?? entry.forms[0];
  if (!form) continue;

  const glosses = (form.meanings ?? []).filter((m) => !SKIP_GLOSS.test(m));
  const en = (glosses.length > 0 ? glosses : form.meanings ?? []).slice(
    0,
    MAX_GLOSSES,
  );
  if (en.length === 0) continue;

  const row = {
    word: entry.simplified,
    reading: form.transcriptions.pinyin,
    en,
    level: `HSK${level}`,
    freq: entry.frequency ?? 999999,
  };
  if (form.traditional && form.traditional !== entry.simplified)
    row.trad = form.traditional;
  if (form.classifiers?.length > 0) row.cls = form.classifiers;
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
