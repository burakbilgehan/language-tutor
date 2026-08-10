---
id: T-087
title: LLM-free mechanical content validator over the full corpus
status: done
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

## Result

Done 2026-08-10. Script: `scripts/validate-content.mjs` (better-sqlite3,
opened `readonly: true`, mutates nothing). Reports are committed under
`tickets/` because `data/` is gitignored:
`tickets/T-087-validator-report.json` (18.6 MB, 36561 findings, the T-091
work list) and `tickets/T-087-validator-summary.md`.

Run against a read-only snapshot taken at 2026-08-10T17:45:57Z (`sqlite3
"file:data/app.db?mode=ro" ".backup ..."`), so the concurrent T-089 nl
regeneration could not affect it. Rows scanned: 4991 zh vocab, 1 ja vocab,
2211 ja kanji, 634 grammar topics (ja 298, zh 184, fr 80, nl 72), tr and en
payload halves.

Per-class counts (actionable / systemic / total):

| Class | Actionable | Systemic | Total |
| --- | --- | --- | --- |
| pinyin_mismatch | 2112 | 3226 | 5338 |
| headword_missing | 472 | 0 | 472 |
| markup_leak | 31 | 0 | 31 |
| script_contamination | 262 | 0 | 262 |
| bracket_shape | 3 | 19906 | 19909 |
| em_dash | 0 | 10549 | 10549 |
| total | 2880 | 33681 | 36561 |

"Systemic" marks findings that are real defects but describe one corpus-wide
generation convention (fixed once in the prompt or renderer), so T-091 works
from the actionable set. Every finding carries table, row id, key, lang and
JSON path either way.

Sanity against T-023: the zh vocab actionable item rate is 30.6% (1525 of
4991), inside the 20-35% band implied by the audit's 59% raw major-plus rate
with mechanical classes at roughly half. ja kanji is 5.4% actionable.

All five acceptance cases verified present in the committed JSON: the 悬念
`note_tr` `<parameter` leak, 竟然 with all 4 examples and all 5 collocations
missing the headword (`charsPresentInOrder: false`, the 竢/竟 substitution),
the 漫画 `mànghuà` pinyin error (46 occurrences corpus-wide), the koto-tote
Cyrillic `старい`, and the fr agreement-advanced `en.intro_tr` leak. The leak
scan also found 29 previously unknown vocab leaks beyond 悬念.

Two findings worth carrying into T-091 and any pipeline work:

- `FURIGANA_RE` takes the WHOLE preceding CJK run as a bracket's host, so
  `我的腿[tuǐ]` draws the ruby "tuǐ" across all three characters even though
  the pinyin is correct for 腿. 7933 brackets over-cover their host this way;
  they are reported under `bracket_shape`, not as pinyin errors.
- The dominant single pattern (11402) is a whole-sentence reading appended
  after the sentence's final punctuation (`...。[Pinyin]`), which the renderer
  cannot pair and therefore shows as literal text. Grammar examples already
  have a dedicated `reading` field rendered on its own line, so the inline
  copy is redundant as well as broken.

Class 1 caveat: the reading table (2632 characters, 9980 aligned word/reading
pairs) is built from word-level readings, so it under-covers neutral-tone
variants and polyphones. Those land in the `tone_only` severity, which is
labelled `confidence: low`; `syllable_mismatch` is `confidence: high` and is
the reliable pinyin work list. Tone sandhi for yi/bu and erhua is whitelisted
so standard orthography is not flagged.

Not scanned: `vocab_entries` rows with null content (the 8189 pending ja vocab
rows), `lessons`/`exercises`/`translations`/`chat_messages` (outside the
ticket's three tables), and the static conjugation tables in
`src/lib/conjugation` (code, covered by T-086).
