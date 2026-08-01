---
id: T-030
title: ja vocabulary dictionary (JMdict-based, copy of the zh vocab pattern)
status: reverted
priority: p2
effort: L
confidence: medium
depends: [T-029]
created: 2026-07-22
closed: 2026-07-22
---
Closing note (Jul 22, 2026): implemented. Data: JLPT levels via
Jonathan Waller/tanos.co.uk (CC BY), through the Bluskyo/JLPT_Vocabulary
conversion; readings+glosses from JMdict/EDRDG (CC BY-SA 4.0), via
scriptin/jmdict-simplified (jmdict-eng). `scripts/build-ja-vocab-index.mjs`
joins+dedupes the two files on the JMdict entry id -> `src/lib/vocab-index/ja-data.json`
(7584 words, N5->N1). Join coverage 99.72% (24 of 8505 forms not in JMdict,
all PDF-conversion garbage, dropped). The T-029 multi-form lesson was applied:
different JMdict entries colliding on the same surface (入る=はいる/いる) are
merged into a single row; the easiest level (max Tanos = N5) plus that reading
comes first, all glosses union without loss; proper-noun senses (n-pr/surname/
place...) are pushed to the end of the gloss list. **v1 limitation**: alternate
readings of a merged surface cannot be searched independently (multi-reading
words like 生, 何 are listed under a single reading). Level source is pre-2010
Tanos lists; may not line up exactly with the modern official split (N3
interpolation).

Code: `vocab-index/ja.ts` + the ja branch of `vocabIndexFor`, `VocabIndexEntry.level`
extended to N5-N1 (schema/save unchanged; vocab_entries.level stays plain text);
`search-index.ts` + `vocab-search.ts` reading-fold is script-aware (kana->romaji
`foldJaReading` / pinyin `foldPinyin`, dispatched per row's own script);
nav gate `["zh","ja"]`; UI `lang` + level labels (VocabSidebar/EntryView)
are derived from the level prefix (N*=ja), EntryView uses `levelDisplay`;
`prompts/vocab.ts`'s 量词 (classifier) line is zh-specific, dropped for ja, examples use
furigana bracket notation. Verification: "uma"/"馬"/"horse" all three find 馬
(headless rankVocab test ALL PASS), parity ALL PASS, 58 unit tests, `npm run build` OK, tsc clean.
In-browser nav rendering (shows for ja, hides for nl) was verified in code,
not in the browser. Attribution **page** deferred to T-036 (code headers already
carry attribution).
Approved (Burak, 2026-07-22): the factual layer comes from the dataset, the
LLM is pedagogy only. This architecture already works for zh (complete-hsk-vocabulary -> index);
ja had no vocabulary dictionary at all. Do NOT scrape Jisho; Jisho is
already a JMdict frontend, so the file itself is downloaded instead.

What we already have (not starting from scratch):
- `src/lib/jmdict/`; a compact subset of JMdict (common entries,
  [word, reading, gloss] triples) already in the repo, with an EDRDG CC BY-SA
  attribution note at the top. SelectionTooltip/kanji lookup use this.
- `vocab_entries` table has a targetLanguage column, schema is ready; UI nav
  gate is `langs: ["zh"]`, ja to be added.
- Kanji index precedent: readings/glosses static, LLM only for the Turkish
  content, same contract.

Work:
1. **Index distillation**: `scripts/build-ja-vocab-index.mjs` ->
   `src/lib/vocab-index/ja-data.json` (same shape as zh-data: word /
   reading(kana) / en[] / level). Gloss+reading source is JMdict (full file,
   not the repo's subset). **Level source is a separate problem**: JLPT has
   no official post-2010 word list; a community list is needed
   (Tanos CC-BY or jlpt-word-list derivatives); note the license in the
   ticket. T-029's multi-form lesson applies here too (a JMdict word can
   have multiple spellings/readings; lossless union, proper-noun-last
   priority).
2. **Core/UI expansion**: `ensureVocabSeeded`/`core/vocab.ts` should recognize
   the ja index (`vocabIndexFor` dispatch), add ja to the nav gate,
   `/vocab?word=` should open for ja. Search: kana + romaji matching
   (`jp.ts` wanakana helpers; T-016 precedent).
3. **LLM half**: `VocabContentSchema`'s 量词 (classifier) field is
   zh-specific; drop or make optional for the ja branch; examples use
   furigana bracket notation. Generation stays user-triggered + packaged
   seed (`seed:vocab` is already language-parameterized).
4. **Attribution**: EDRDG requirement; the attribution page work merges
   with the license ticket; the full-file JMdict usage should be listed there.

Verification: "uma" / "馬" / "horse" all three find the same word; parity
harness ALL PASS; nav shows the Dictionary tab on a ja profile, hides it
on nl.

Reverted (2026-07-22, Burak): despite two correction rounds, content quality
remained unacceptable (wrong entry matches: いくら->"salmon roe",
甘い->"skillful", 前->さき; sense-restriction violations; no multi-reading
representation). The ja dictionary surface was fully torn out: index/build
script deleted, nav zh-only, listVocab returns empty for a language without
an index (stale seed rows no longer show). The zh dictionary and ranking
improvements (gloss-quality sub-score) stayed in place.
Lesson: a JMdict distillation should not ship without Jisho-level
presentation structure (sense groups, appliesToKana, multi-reading support);
if retried, get visual-prototype approval first, then do the data work.

DB leftover (discovered + cleaned up 2026-07-27): the revert deleted the
code files (index, build script, nav gate) but left the 8190 ja rows that
the experiment's `ensureVocabSeeded` had written into `vocab_entries`
(N1=3157, N2=1892, N3=1731, N4=690, N5=720; one was `ready`, having burned
an actual LLM call) in the DB. `scripts/blast-generate.ts` reads directly
from `vocab_entries WHERE status IN ('pending','error')` rather than the
index file, so it saw and queued these 8190 ghost rows, which would have
triggered pointless LLM generation for content that could never be shown
in any UI. Cleaned up with
`DELETE FROM vocab_entries WHERE target_language='ja'`; the table now
contains only the real zh rows (4991). Lesson: a code revert doesn't
automatically clean up the DB seed; when reverting an index/language
version, separately check whether the corresponding DB rows also need
deleting.
