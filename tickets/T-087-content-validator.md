---
id: T-087
title: LLM-free mechanical content validator over the full corpus
status: todo
priority: p1
effort: M
confidence: high
depends: []
created: 2026-08-10
---
The T-023 audit found that roughly half of all major errors fall into
mechanically detectable classes. Build a script (`scripts/`, better-sqlite3,
read-only against `data/app.db`) that sweeps ALL content (4991 zh vocab +
2211 ja kanji + all grammar topics, tr and en payloads) and reports:

1. Bracket pinyin mismatches: every `汉字[pinyin]` occurrence checked against
   a hanzi-to-pinyin table (the static `reading` column of `vocab_entries`
   plus `src/lib/vocab-index/zh-data.json` gives per-word readings; build a
   per-character reading set from them; tone-mark comparison with a
   neutral-tone tolerance).
2. Headword containment: vocab examples and collocations that do not contain
   the headword; kanji example words that do not contain the kanji.
3. Leak scan: `<parameter`, `</`, `<function`, and similar markup fragments
   inside any content string (the 悬念 and fr agreement-advanced cases).
4. Script contamination: Cyrillic, hangul, or other non-target-script
   letters inside target-language fields (the koto-tote "старい" case).
5. Bracket shape: whole-sentence pinyin in a single bracket, brackets not
   attached to a preceding CJK token (the Furigana renderer pairs a bracket
   with the preceding token, so these render wrong).
6. Em dash occurrences in learner-facing strings (AGENTS.md ban).

Output: a machine-readable JSON report (item key + field + class + detail)
plus a human summary with per-surface counts, written under `data/` or
`tickets/` (NOT committed content changes; the script mutates nothing).
This report is the work list for T-091.

Acceptance: script runs clean on the snapshot, its counts are sane against
the T-023 sample rates (mechanical classes were ~half of majors), and the
known cases above appear in its output (悬念 leak, 竟然 wrong-char examples,
漫画 `mànghuà` style pinyin errors).
