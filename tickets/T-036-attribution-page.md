---
id: T-036
title: Attribution/license page (EDRDG JMdict, Tanos JLPT, HSK, KanjiVG…)
status: done
priority: p2
effort: S
confidence: high
depends: []
created: 2026-07-22
---
Opened by T-030: the full JMdict file is now used in the ja vocabulary
dictionary, and the EDRDG license (CC BY-SA 4.0) requires **visible
attribution**. Right now attribution only exists in code headers
(`src/lib/vocab-index/ja.ts`, `scripts/build-ja-vocab-index.mjs`,
`src/lib/jmdict/index.ts`); there's no user-visible attribution page. This
ticket opens that page (e.g. `/about` or "Sources & Licenses" under
Settings) collecting everything in one place.

Sources to list (all already used in the repo):
- **JMdict**; EDRDG, CC BY-SA 4.0 (https://www.edrdg.org/edrdg/licence.html).
  ja vocabulary dictionary's reading+gloss source (full file) + the
  SelectionTooltip/kanji lookup subset. Via jmdict-simplified
  (scriptin/jmdict-simplified).
- **JLPT level list**; Jonathan Waller / tanos.co.uk, CC BY. ja
  vocabulary dictionary's level source. Machine-readable conversion via
  Bluskyo/JLPT_Vocabulary (MIT tool, CC BY data). NOTE: Tanos lists
  predate the 2010 4->5 level reform; this "5-level" derivative
  interpolates N3, and may not line up exactly with the modern official
  split.
- **HSK 2.0 word list**; drkameleon/complete-hsk-vocabulary (MIT,
  glosses are a CC-CEDICT derivative -> CC BY-SA). zh vocabulary
  dictionary.
- Sweep other existing sources too (KanjiVG stroke data etc.) and collect
  them on the one page.

Output: one user-visible attribution/license page + a footer/settings
link.

---
Status (2026-07-22, wave 4.5): done; `/about` (Sources & Licenses) + a Settings link.
Source list pulled after verification: JMdict/KANJIDIC2 (EDRDG CC BY-SA
4.0, still carries kanji lookup + SelectionTooltip), kanji-data (MIT
tool), Tanos JLPT (CC BY, with the 2010-reform note), complete-hsk-vocabulary
(MIT + CC-CEDICT gloss), hanzi-writer-data-jp (NOT KanjiVG; a Make Me a
Hanzi/animCJK derivative, LGPL/Arphic/Unicode) and Hanzi Writer (MIT).
KanjiVG isn't actually in the repo.
Open question CLOSED (2026-07-22, Burak approved): inline attribution added
to SelectionTooltip; while ja-mode word/kanji dictionary data is showing,
the line below reads "JMdict/KANJIDIC2 © EDRDG" (the zh path is an LLM
translation and needs no attribution; details on /about).
