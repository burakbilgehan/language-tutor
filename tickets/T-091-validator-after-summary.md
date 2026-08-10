# T-087 mechanical content validator: summary

Generated 2026-08-10T19:49:40.071Z from `data/postfix-snapshot.db` (snapshot mtime 2026-08-10T19:47:16.467Z).
Read-only sweep; the validator opens the DB with `readonly: true` and changes nothing.
Machine-readable work list: `tickets/T-091-validator-after.json` (22769 findings).

Findings split into **actionable** (a per-item defect T-091 fixes row by row) and **systemic** (a real defect that describes a corpus-wide generation convention, so it is fixed once in the prompt or renderer, not 10k times in the data). Both are kept per item in the JSON; the split is a triage aid, not a severity claim.

## Findings by class

| Class | Actionable | Systemic | Total |
| --- | --- | --- | --- |
| pinyin_mismatch | 897 | 3224 | 4121 |
| headword_missing | 471 | 0 | 471 |
| markup_leak | 0 | 0 | 0 |
| script_contamination | 259 | 0 | 259 |
| bracket_shape | 0 | 15162 | 15162 |
| em_dash | 0 | 2756 | 2756 |
| **total** | **1627** | **21142** | **22769** |

### By severity

| Class and severity | Findings |
| --- | --- |
| bracket_shape:bracket_overcovers_host | 7927 |
| bracket_shape:unpaired_bracket | 6662 |
| pinyin_mismatch:tone_only | 3224 |
| em_dash:n/a | 2756 |
| pinyin_mismatch:syllable_mismatch | 897 |
| bracket_shape:sentence_in_one_bracket | 573 |
| headword_missing:n/a | 471 |
| script_contamination:latin_in_target | 211 |
| script_contamination:foreign_script | 48 |

## Findings by surface

| Surface | Rows scanned | Items w/ any finding | Rate | Items w/ actionable | Rate | pinyin_mismatch | headword_missing | markup_leak | script_contamination | bracket_shape | em_dash |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| grammar-fr | 80 | 28 | 35.0% | 5 | 6.3% | 0 | 0 | 0 | 10 | 110 | 0 |
| grammar-ja | 298 | 132 | 44.3% | 3 | 1.0% | 0 | 0 | 0 | 4 | 942 | 0 |
| grammar-nl | 72 | 14 | 19.4% | 0 | 0.0% | 0 | 0 | 0 | 0 | 47 | 0 |
| grammar-zh | 184 | 164 | 89.1% | 18 | 9.8% | 206 | 0 | 0 | 3 | 2138 | 0 |
| kanji-ja | 2211 | 125 | 5.7% | 120 | 5.4% | 0 | 134 | 0 | 2 | 5 | 0 |
| vocab-ja | 1 | 0 | 0.0% | 0 | 0.0% | 0 | 0 | 0 | 0 | 0 | 0 |
| vocab-zh | 4991 | 4102 | 82.2% | 940 | 18.8% | 3915 | 337 | 0 | 240 | 11920 | 2756 |

## Class 1 coverage

Reading table: 2632 characters from 9980 aligned word/reading pairs (2 rows dropped for a character/syllable count mismatch), plus tone-sandhi exceptions for yi, bu and erhua so standard orthography is not flagged.

Brackets judged: 89776. Skipped: 1703 for an out-of-table character, 13786 for a host longer than 4 characters, 1 for a non-hanzi host, 6 for an empty reading. Unknown-character skip rate: 1.9%.

The host-length gate matters because `FURIGANA_RE` takes the WHOLE preceding CJK run as a bracket's host, so `我的腿[tuǐ]` yields the host 我的腿 even though the pinyin is correct for 腿 alone. On sentence-length hosts a single word-boundary neutralization defeats the reading search and the finding would describe the wrong thing; those brackets are reported under `bracket_shape` instead, which is what they actually are.

Top failing hosts: 这个:199, 个:186, 只:80, 一个:51, 寸:42, 那个:25, 玩家:24, 告诉:19, 多少:18, 下去:18, 穴:17, 决定:15, 两个:13, 主人公:13, 故事:13, 不同:13, 吩咐:13, 一只:12, 其:11, 整个:11.

## Systemic patterns

These are real defects, but each describes one generation convention applied across the corpus, so the fix belongs in the prompt or the renderer rather than in per-row edits.

| Pattern | Findings |
| --- | --- |
| bracket_shape:bracket_overcovers_host | 7927 |
| bracket_shape:unpaired_bracket | 6662 |
| pinyin_mismatch:tone_only | 3224 |
| em_dash:n/a | 2756 |
| bracket_shape:sentence_in_one_bracket | 573 |

- `bracket_shape:unpaired_bracket` is the dominant one: the pipeline appends a whole-sentence reading after the sentence's final punctuation (`...。[Pinyin]`). Because the renderer pairs a bracket only with an immediately preceding CJK token, U+3002 and friends break the pairing and the bracket is shown to the learner as literal text. Grammar examples already carry a dedicated `reading` field that `GrammarTopicView` renders on its own line, so the inline copy is redundant as well as broken.
- `em_dash` is the AGENTS.md ban. The bulk sits in `vocab-zh $.chars[].hint_tr` and the grammar table rows, that is, in prompt-shaped prose, so it is a prompt fix plus one sweep.
- `pinyin_mismatch:tone_only` is grouped here because the reading table is built from word-level readings and therefore under-covers neutral-tone variants and polyphones; 个 written `ge`, 告诉 written `gàosu` and 只 written `zhī` are all correct pinyin the table cannot confirm. Treat `syllable_mismatch` (marked `confidence: high`) as the reliable pinyin work list; a genuinely dropped tone does land in `tone_only`, so the bucket is worth spot-checking but not worth fixing wholesale.

## Not scanned

- vocab_entries rows with null content (ja vocab is not generated)
- lessons, exercises, translations, chat_messages (out of ticket scope)
- static conjugation tables in src/lib/conjugation (code, covered by T-086)
