---
id: T-019
title: Bulk-fill zh vocab dictionary content + packaged seed
status: done
priority: p2
effort: M
confidence: high
depends: []
created: 2026-07-18
---
Most vocab entries are empty; the filled-in word example (的: examples +
collocations + character analysis) was well received, the goal is to bring
the whole HSK list to that quality. This is the "packaged content seed" work
that was deliberately deferred in T-012.

Answer to "is the content uniform": yes, each word is generated **once**
(`VocabContentSchema`: meanings_tr + note + 量词 note + examples +
collocations + character breakdown, zod-validated), cached in the DB; the LLM
doesn't regenerate it on every open. The structure is fixed by the schema, so
every word comes with the same sections.

The work has two parts (an exact copy of the grammar pattern):
1. **Bulk generation script**: DONE (2026-07-18, in the backlog session):
   `scripts/blast-generate.ts` extended to cover vocab too (pending/error
   `vocab_entries` -> `generateVocabContent`, ordered by position = HSK1->6).
   Control panel: `node scripts/blast-dashboard.mjs`
   -> http://127.0.0.1:4646 (live monitoring + stop/start/concurrency).
   Keep concurrency in the 8-16 band; 100 was tried and the machine choked,
   with calls hitting the 120s timeout. Once the kanji queue finishes, vocab
   enters the queue automatically; will run in the next quota window.
   Note: the list GET never auto-queues (T-012 decision), that rule still
   stands.
2. **Packaged seed**: DONE (2026-07-18). `npm run seed:vocab`
   (`scripts/export-vocab-seed.ts`, an exact copy of the grammar
   `export-grammar-seed.ts` pattern), exports ready entries from `data/app.db`
   to `public/vocab-seed/<lang>.json`. `applyVocabSeed` (core/vocab.ts, the
   same as grammar's `applyGrammarSeed`, word-keyed) fills pending/error rows
   from the seed. Wiring (identical to grammar): server `/api/vocab` GET list
   (caches the file for the process lifetime); static mode `client-api.ts`
   `vocabList` + `vocabDetail` (downloaded from the browser via
   `src/lib/vocab-seed.ts` `fetchVocabSeed`, per-language promise cache).
   The server `/api/vocab/[word]` deep-link route doesn't touch the seed, like
   grammar's `[slug]` (deliberate, that's the pattern; only the list GET and
   the static client-api apply it).

   Verification: `npx tsc --noEmit` clean, parity harness ALL PASS
   (including `listVocab (zh seed) -> 4991 words`), `npm run seed:vocab`
   exported 2 ready words from the real DB (the rest is being filled by the
   blast run in the background), `applyVocabSeed` pending->ready fill was
   manually verified on a temporary DB copy (see session note, filled:1,
   hasContent:true).

Note: the committed `public/vocab-seed/zh.json` currently has only 2 words
(the blast queue hasn't finished), a full re-export with the complete library
is planned in INDEX.md ops step 3 ("seed:grammar + seed:vocab re-export ->
commit -> Pages deploy"); this is a deliberate gap, not something forgotten.
</content>
