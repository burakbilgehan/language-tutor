# T-087 mechanical content validator: summary

Generated 2026-08-10T21:08:42.938Z from `data/t093-snapshot-final.db` (snapshot mtime 2026-08-10T21:08:41.774Z).
Read-only sweep; the validator opens the DB with `readonly: true` and changes nothing.
Machine-readable work list: `tickets/T-093-validator-after.json` (20463 findings).

Findings split into **actionable** (a per-item defect T-091 fixes row by row) and **systemic** (a real defect that describes a corpus-wide generation convention, so it is fixed once in the prompt or renderer, not 10k times in the data). Both are kept per item in the JSON; the split is a triage aid, not a severity claim.

## Findings by class

| Class | Actionable | Systemic | Total |
| --- | --- | --- | --- |
| pinyin_mismatch | 47 | 2992 | 3039 |
| headword_missing | 75 | 0 | 75 |
| markup_leak | 0 | 0 | 0 |
| script_contamination | 213 | 0 | 213 |
| bracket_shape | 0 | 14593 | 14593 |
| em_dash | 0 | 2543 | 2543 |
| **total** | **335** | **20128** | **20463** |

### By severity

| Class and severity | Findings |
| --- | --- |
| bracket_shape:bracket_overcovers_host | 7056 |
| bracket_shape:unpaired_bracket | 6954 |
| pinyin_mismatch:tone_only | 2992 |
| em_dash:n/a | 2543 |
| bracket_shape:sentence_in_one_bracket | 583 |
| script_contamination:latin_in_target | 213 |
| headword_missing:n/a | 75 |
| pinyin_mismatch:syllable_mismatch | 47 |

## Findings by surface

| Surface | Rows scanned | Items w/ any finding | Rate | Items w/ actionable | Rate | pinyin_mismatch | headword_missing | markup_leak | script_contamination | bracket_shape | em_dash |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| grammar-fr | 80 | 24 | 30.0% | 0 | 0.0% | 0 | 0 | 0 | 0 | 112 | 0 |
| grammar-ja | 298 | 131 | 44.0% | 2 | 0.7% | 0 | 0 | 0 | 3 | 942 | 0 |
| grammar-nl | 72 | 14 | 19.4% | 0 | 0.0% | 0 | 0 | 0 | 0 | 47 | 0 |
| grammar-zh | 184 | 164 | 89.1% | 9 | 4.9% | 183 | 0 | 0 | 0 | 2238 | 0 |
| kanji-ja | 2211 | 9 | 0.4% | 4 | 0.2% | 0 | 3 | 0 | 1 | 5 | 0 |
| vocab-ja | 1 | 0 | 0.0% | 0 | 0.0% | 0 | 0 | 0 | 0 | 0 | 0 |
| vocab-zh | 4991 | 3902 | 78.2% | 209 | 4.2% | 2856 | 72 | 0 | 209 | 11249 | 2543 |

## Class 1 coverage

Reading table: 2632 characters from 9980 aligned word/reading pairs (2 rows dropped for a character/syllable count mismatch), plus tone-sandhi exceptions for yi, bu and erhua so standard orthography is not flagged.

Brackets judged: 88028. Skipped: 1544 for an out-of-table character, 14274 for a host longer than 4 characters, 1 for a non-hanzi host, 6 for an empty reading. Unknown-character skip rate: 1.7%.

The host-length gate matters because `FURIGANA_RE` takes the WHOLE preceding CJK run as a bracket's host, so `我的腿[tuǐ]` yields the host 我的腿 even though the pinyin is correct for 腿 alone. On sentence-length hosts a single word-boundary neutralization defeats the reading search and the finding would describe the wrong thing; those brackets are reported under `bracket_shape` instead, which is what they actually are.

Top failing hosts: 个:196, 这个:188, 只:77, 一个:46, 寸:35, 那个:25, 玩家:21, 告诉:20, 故事:17, 多少:16, 穴:16, 下去:14, 决定:13, 教:13, 吩咐:13, 一只:11, 餐厅:11, 极其:10, 其:10, 切:10.

## Systemic patterns

These are real defects, but each describes one generation convention applied across the corpus, so the fix belongs in the prompt or the renderer rather than in per-row edits.

| Pattern | Findings |
| --- | --- |
| bracket_shape:bracket_overcovers_host | 7056 |
| bracket_shape:unpaired_bracket | 6954 |
| pinyin_mismatch:tone_only | 2992 |
| em_dash:n/a | 2543 |
| bracket_shape:sentence_in_one_bracket | 583 |

- `bracket_shape:unpaired_bracket` is the dominant one: the pipeline appends a whole-sentence reading after the sentence's final punctuation (`...。[Pinyin]`). Because the renderer pairs a bracket only with an immediately preceding CJK token, U+3002 and friends break the pairing and the bracket is shown to the learner as literal text. Grammar examples already carry a dedicated `reading` field that `GrammarTopicView` renders on its own line, so the inline copy is redundant as well as broken.
- `em_dash` is the AGENTS.md ban. The bulk sits in `vocab-zh $.chars[].hint_tr` and the grammar table rows, that is, in prompt-shaped prose, so it is a prompt fix plus one sweep.
- `pinyin_mismatch:tone_only` is grouped here because the reading table is built from word-level readings and therefore under-covers neutral-tone variants and polyphones; 个 written `ge`, 告诉 written `gàosu` and 只 written `zhī` are all correct pinyin the table cannot confirm. Treat `syllable_mismatch` (marked `confidence: high`) as the reliable pinyin work list; a genuinely dropped tone does land in `tone_only`, so the bucket is worth spot-checking but not worth fixing wholesale.

## Not scanned

- vocab_entries rows with null content (ja vocab is not generated)
- lessons, exercises, translations, chat_messages (out of ticket scope)
- static conjugation tables in src/lib/conjugation (code, covered by T-086)
