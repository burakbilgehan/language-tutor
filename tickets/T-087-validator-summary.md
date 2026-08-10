# T-087 mechanical content validator: summary

Generated 2026-08-10T18:04:31.967Z from `data/audit-snapshot.db` (snapshot mtime 2026-08-10T17:45:57.357Z).
Read-only sweep; the validator opens the DB with `readonly: true` and changes nothing.
Machine-readable work list: `tickets/T-087-validator-report.json` (36561 findings).

Findings split into **actionable** (a per-item defect T-091 fixes row by row) and **systemic** (a real defect that describes a corpus-wide generation convention, so it is fixed once in the prompt or renderer, not 10k times in the data). Both are kept per item in the JSON; the split is a triage aid, not a severity claim.

## Findings by class

| Class | Actionable | Systemic | Total |
| --- | --- | --- | --- |
| pinyin_mismatch | 2112 | 3226 | 5338 |
| headword_missing | 472 | 0 | 472 |
| markup_leak | 31 | 0 | 31 |
| script_contamination | 262 | 0 | 262 |
| bracket_shape | 3 | 19906 | 19909 |
| em_dash | 0 | 10549 | 10549 |
| **total** | **2880** | **33681** | **36561** |

### By severity

| Class and severity | Findings |
| --- | --- |
| bracket_shape:unpaired_bracket | 11402 |
| em_dash:n/a | 10549 |
| bracket_shape:bracket_overcovers_host | 7933 |
| pinyin_mismatch:tone_only | 3226 |
| pinyin_mismatch:syllable_mismatch | 2112 |
| bracket_shape:sentence_in_one_bracket | 571 |
| headword_missing:n/a | 472 |
| script_contamination:latin_in_target | 211 |
| script_contamination:foreign_script | 51 |
| markup_leak:parameter_tag | 31 |
| bracket_shape:empty_bracket | 3 |

## Findings by surface

| Surface | Rows scanned | Items w/ any finding | Rate | Items w/ actionable | Rate | pinyin_mismatch | headword_missing | markup_leak | script_contamination | bracket_shape | em_dash |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| grammar-fr | 80 | 80 | 100.0% | 6 | 7.5% | 0 | 0 | 1 | 10 | 110 | 791 |
| grammar-ja | 298 | 297 | 99.7% | 5 | 1.7% | 0 | 0 | 0 | 5 | 947 | 2586 |
| grammar-nl | 72 | 71 | 98.6% | 0 | 0.0% | 0 | 0 | 0 | 0 | 59 | 556 |
| grammar-zh | 184 | 184 | 100.0% | 24 | 13.0% | 238 | 0 | 0 | 3 | 4380 | 2419 |
| kanji-ja | 2211 | 437 | 19.8% | 120 | 5.4% | 0 | 134 | 0 | 2 | 5 | 373 |
| vocab-ja | 1 | 0 | 0.0% | 0 | 0.0% | 0 | 0 | 0 | 0 | 0 | 0 |
| vocab-zh | 4991 | 4442 | 89.0% | 1525 | 30.6% | 5100 | 338 | 30 | 242 | 14408 | 3824 |

## Class 1 coverage

Reading table: 2632 characters from 9980 aligned word/reading pairs (2 rows dropped for a character/syllable count mismatch), plus tone-sandhi exceptions for yi, bu and erhua so standard orthography is not flagged.

Brackets judged: 89686. Skipped: 1706 for an out-of-table character, 13813 for a host longer than 4 characters, 1 for a non-hanzi host, 6 for an empty reading. Unknown-character skip rate: 1.9%.

The host-length gate matters because `FURIGANA_RE` takes the WHOLE preceding CJK run as a bracket's host, so `我的腿[tuǐ]` yields the host 我的腿 even though the pinyin is correct for 腿 alone. On sentence-length hosts a single word-boundary neutralization defeats the reading search and the finding would describe the wrong thing; those brackets are reported under `bracket_shape` instead, which is what they actually are.

Top failing hosts: 这个:199, 个:186, 只:80, 一个:51, 寸:44, 这部动漫:35, 动漫:33, 漫画:26, 那个:25, 玩家:24, 得:21, 告诉:19, 多少:18, 下去:18, 穴:17, 两个:15, 决定:15, 吨:15, 能力:14, 主人公:13.

## Systemic patterns

These are real defects, but each describes one generation convention applied across the corpus, so the fix belongs in the prompt or the renderer rather than in per-row edits.

| Pattern | Findings |
| --- | --- |
| bracket_shape:unpaired_bracket | 11402 |
| em_dash:n/a | 10549 |
| bracket_shape:bracket_overcovers_host | 7933 |
| pinyin_mismatch:tone_only | 3226 |
| bracket_shape:sentence_in_one_bracket | 571 |

- `bracket_shape:unpaired_bracket` is the dominant one: the pipeline appends a whole-sentence reading after the sentence's final punctuation (`...。[Pinyin]`). Because the renderer pairs a bracket only with an immediately preceding CJK token, U+3002 and friends break the pairing and the bracket is shown to the learner as literal text. Grammar examples already carry a dedicated `reading` field that `GrammarTopicView` renders on its own line, so the inline copy is redundant as well as broken.
- `em_dash` is the AGENTS.md ban. The bulk sits in `vocab-zh $.chars[].hint_tr` and the grammar table rows, that is, in prompt-shaped prose, so it is a prompt fix plus one sweep.
- `pinyin_mismatch:tone_only` is grouped here because the reading table is built from word-level readings and therefore under-covers neutral-tone variants and polyphones; 个 written `ge`, 告诉 written `gàosu` and 只 written `zhī` are all correct pinyin the table cannot confirm. Treat `syllable_mismatch` (marked `confidence: high`) as the reliable pinyin work list; a genuinely dropped tone does land in `tone_only`, so the bucket is worth spot-checking but not worth fixing wholesale.

## Not scanned

- vocab_entries rows with null content (ja vocab is not generated)
- lessons, exercises, translations, chat_messages (out of ticket scope)
- static conjugation tables in src/lib/conjugation (code, covered by T-086)
