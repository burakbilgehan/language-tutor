---
id: T-012
title: zh word dictionary (HSK vocab cheatsheet)
status: done
priority: p2
effort: M
confidence: high
depends: []
created: 2026-07-18
---
A level-based dictionary for Chinese. NOT the zh counterpart of the ja kanji
section: in Chinese the unit of study is the word (词), not the character;
HSK already defines a word list per level (HSK 1-6, cumulative ~5000). The
character/stroke side (T-005) stays separate (CEDICT + stroke trainer); this
ticket is the word surface.

Decisions (Jul 18 2026, from conversation):
- v1 scope: zh only. Schema/UI are language-agnostic
  (vocab_entries.target_language), the index is bundled for zh only; ja
  (JLPT) / nl (CEFR) are a later ticket.
- SRS integration is OUT of v1, read-only cheatsheet (like grammar). "Add to
  deck" is a later iteration.
- Pattern: the grammar/kanji cheatsheet pattern. Static deterministic index
  (`src/lib/vocab-index/zh.ts|json`: word + pinyin + English gloss + HSK
  level + position) -> incremental diff-seed (`ensureSeeded` contract: add
  what's missing, re-sync static fields, don't touch content/status) -> entry
  content is generated on demand via LLM, then cached.
- LLM enrichment content (zod, schemas.ts): explanation in the native
  language, example sentences (pinyin bracket notation `学生[xuésheng]`),
  collocations, measure word (量词) for nouns, character breakdown
  (radical/phonetic component hint). Measure word is a zh-specific required
  field.
- Data source: an open HSK 2.0 JSON list is vendored (jmdict precedent); if
  glosses are CEDICT-derived, a CC-BY-SA attribution note per file.
- New table `vocab_entries` (kanjiEntries pattern, but a single, generic
  `reading` column) -> a SAVE_SCHEMA_VERSION bump.
- Seam: business logic in `src/core/vocab.ts` (AppDb + Gen), routes are thin
  shells, client-api.ts IS_STATIC branch, inline generation in static mode.
- UI: `/vocab` (level groups + search, visible in nav only on a zh profile),
  detail at `/vocab?word=` query param (static export rule, Suspense).

Deliberately out of v1: a packaged content seed (`public/vocab-seed/`), to be
added with the grammar-seed pattern once the owner has generated content.

Closing note (Jul 18 2026): implemented. Data:
drkameleon/complete-hsk-vocabulary (MIT) -> `scripts/build-vocab-index.mjs`
-> `src/lib/vocab-index/zh-data.json` (4991 words, old-HSK 1-6).
`vocab_entries` + SAVE_SCHEMA_VERSION 6, `src/core/vocab.ts`,
`generateVocabContent` (fast tier), `/api/vocab*` (list GET doesn't trigger
the LLM, deliberately unlike kanji), client-api seam, `/vocab?word=` UI
(clone of the grammar quartet; closed level groups don't render, search is
diacritic-insensitive, CAP 100). Nav `langs:["zh"]`.
Also: browser.ts DDL replay (try/catch), old IndexedDB images pick up the new
table automatically. Verification: tsc, 56 unit tests, parity ALL PASS
(including listVocab/findVocab/generateVocabContent), fixture dev smoke
(list -> generate -> ready), build:static OK.
