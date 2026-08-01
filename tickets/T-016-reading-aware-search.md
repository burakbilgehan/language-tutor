---
id: T-016
title: Reading-aware search in ideogram-based languages (hikari -> 光, multiple results)
status: done
priority: p2
effort: M
confidence: medium
depends: []
created: 2026-07-18
closed: 2026-07-18
---
## Solution (MVP, layer 1)
Global cmd+K command palette. Layer 2 (in-page cmd+F intercept) not done;
separate ticket if needed.

- `src/lib/search-index.ts`: deterministic, reading-aware search; operates
  over the static kanji/vocab/grammar indexes (no LLM/DB/network, also works
  in static mode). Reading folding: ja -> `toRomajiReading` (kun markers
  `.`/`-` stripped), zh -> `foldPinyin`; both sides are folded and matched by
  substring. Results capped at ~24, `buildSearchIndex` is built once with
  `useMemo` at the call site (~7500 entries, no folding per keystroke).
- `src/components/shared/CommandPalette.tsx`: mounted in `layout.tsx` next to
  SelectionTooltip. cmd/ctrl-K toggle + header search button 🔍 (`palette:open`
  custom event). Arrow key/Enter/Escape navigation, type+level label.
- `/stroke?char=<kanji>` deep-link added (StrokeTrainer `initialChar` prop,
  page Suspense-wrapped): clicking a kanji result goes to the stroke page and
  opens that kanji (no separate kanji detail route). vocab -> `/vocab?word=`,
  grammar -> `/grammar?topic=`.

Scope: indexes only (MVP decision). Lesson content search not done, would be
a separate ticket. E2E verified (ja profile): hikari->光 click->/stroke, "fiil"
("verb") -> grammar list, zh pinyin (pengyou->朋友) verified in a module test.

Browser cmd+F doesn't work on ideograms: typing "hikari" should find 光.
Kanji/reading matching is many-to-many (same reading -> multiple kanji, same
kanji -> multiple readings), so a single result isn't enough, a result list is
required.

Two layers were considered, the ticket covers both (the first is the MVP):
1. **Global search (MVP)**: search box / cmd+K palette in the header. Fold
   romaji or kana input with wanakana (infrastructure ready in `src/lib/jp.ts`),
   search across the kanji dictionary + vocab index + grammar index titles,
   list results with a type label (kanji/word/grammar), clicking goes to the
   relevant page (`/vocab?word=`, `/grammar?topic=`, kanji detail). On the zh
   side, pinyin folding (tone mark/digit/u-v) already exists in `src/lib/zh.ts`.
2. **In-page find (optional further step)**: intercept cmd+F and highlight
   reading-matched CJK text on the page. Risky/expensive; only if the MVP
   isn't enough.

Data sources are ready: ja kanji dictionary, zh `src/lib/vocab-index/zh-data.json`
(4991 words, pinyin+gloss), grammar indexes. No new LLM call needed, fully
deterministic, also works in static mode.

Open design decision: search scope (indexes/dictionary only, or lesson content
too?). MVP: indexes. Lesson content search would be a separate ticket.
</content>
