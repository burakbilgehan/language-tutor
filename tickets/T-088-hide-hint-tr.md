---
id: T-088
title: Stop rendering fabricated character etymology hints (hint_tr)
status: todo
priority: p1
effort: XS
confidence: high
depends: []
created: 2026-08-10
---
`chars[].hint_tr` (the small gray "Radikal X + bileşen Y" line under each
character card on /vocab detail, `VocabEntryView.tsx:239`) is the single
largest error class of the T-023 audit: haiku systematically invents
radicals and components (电 built from 王+气, one hint containing a hangul
syllable, self-contradicting tr/en pairs). It is a mnemonic aid, not core
content.

Change: stop rendering `hint_tr` in `VocabEntryView.tsx` (keep char, reading,
meaning_tr). Keep the data in the DB and the schema field (nullish already);
also drop the `hint_tr` request from the vocab generation prompt
(`src/lib/llm/prompts/vocab.ts`) so future generations do not produce it.
Reversible later if a real decomposition dataset (e.g. IDS/cjkvi data) is
wired in; that would be a new ticket.

Acceptance: vocab detail no longer shows the hint line; `npm test` green;
no schema or save-format change.
