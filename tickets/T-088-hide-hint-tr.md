---
id: T-088
title: Stop rendering fabricated character etymology hints (hint_tr)
status: done
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

## Result

Done 2026-08-10.

- `VocabEntryView.tsx`: removed the `hint_tr` conditional paragraph under the
  character card (was lines 239-241); char, reading, meaning_tr remain.
- `src/lib/llm/prompts/vocab.ts`: the `chars` bullet now asks only for
  `{ "char", "reading", "meaning_tr" }`; the `hint_tr` clause is gone.
- `src/lib/llm/schemas.ts` untouched as scoped (`hint_tr` stays `nullish()`);
  existing DB rows, packaged seeds, and the fixture bundle keep their stored
  values, now inert since nothing reads the field. The vocab fixture is keyed
  by a static `fixtureKey: "vocab"` literal, not a prompt hash, so the prompt
  edit does not stale the fixture bundle.
- No test referenced the removed rendering; `npm test` and `tsc --noEmit`
  green.
