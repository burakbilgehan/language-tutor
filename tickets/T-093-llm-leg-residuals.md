---
id: T-093
title: T-091 LLM leg (944 items) + residual content decisions
status: done
priority: p1
effort: M
confidence: high
depends: []
created: 2026-08-10
---
The T-091 mechanical round finished (36450 -> 22769 findings, markup leaks
zeroed, 3012 rows fixed); its LLM leg hit the owner's 800-item guardrail and
was deliberately NOT run. This ticket is that remaining work, enumerated in
`tickets/T-091-validator-after.json` (fresh post-fix report) and the Result
section of `tickets/T-091-targeted-fix-round.md`.

1. **LLM leg, 944 distinct items** (headword_missing 345, foreign-script
   contamination 43, ambiguous-pinyin 589, minus overlap): targeted sonnet
   regeneration via `scripts/regen-content.ts` (concurrent pool, row-as-unit,
   per-item defect verification; T-090 pattern). At the observed pace this is
   roughly 2-3 hours at conc=16. NOTE: the owner's Max subscription lapses
   2026-08-10 midnight; this run needs a renewed subscription, an API key
   through the same provider seam, or another backend.
2. **Product decisions, no code yet:**
   - `bracket_overcovers_host` (7927): pinyin correct but ruby drawn over the
     whole preceding CJK run. Options: renderer-side pairing fix, prompt-side
     per-word bracketing, or accept.
   - `sentence_in_one_bracket` (573) and residual `unpaired_bracket` (6662):
     strip on sight like the T-091 pass did for the trailing-sentence subset,
     or regenerate the sentences with per-word brackets.
3. **Cheap manual fixes:** 4 named real `tone_only` errors (listed in the
   T-091 Result); hand-edit or fold into the LLM leg.
4. **Validator precision bug:** `validate-content.mjs` over-files grammar
   pattern-slot brackets (noted in T-091 Result); fix before using its counts
   as an absolute quality metric.

Acceptance: LLM leg run with per-item defect verification and the validator
re-run showing the addressed classes at zero or explained residual; the
product decisions recorded (even if the decision is "accept").

## Result

Done 2026-08-10, items 1 and 3 (the LLM leg and the four named tone_only
errors). Items 2 and 4 (product decisions on the bracket classes, validator
precision bug) were explicitly OUT of this run's scope per the owner's
instruction and remain open; they should be re-ticketed if wanted.

### Setup

Dated backup taken to the Desktop before any write
(`app-db-backup-2026-08-10-t093.db`). Fresh snapshot + a fresh
`validate-content.mjs` run first (committed as
`tickets/T-093-validator-before.json`): 22769 findings, byte-identical to the
committed T-091 after-report, so the work list was not stale. All writes went
to `data/app.db` only, via the drizzle UPDATE path inside the driver plus
three targeted `UPDATE ... replace()` statements; no DELETE/DROP, no seed
export, no deploy.

### Driver

New `t093` mode in `scripts/regen-content.ts` (plus
`scripts/t093-checks.mjs`, a port of the validator's pure check functions,
which cannot be imported directly because the validator runs its sweep on
import). The mode reads a validator JSON report, selects the three target
classes (headword_missing; script_contamination:foreign_script;
pinyin_mismatch:syllable_mismatch minus slash-alternation notation), groups
findings row-as-unit (tr+en sequential in one worker, same lost-update rule
as the other modes), regenerates each flagged language half, verifies the
targeted defect classes against the fresh payload, and re-rolls a failed
half up to 3 attempts. Resume ledger keys `t093:<table>:<key>:<lang>`;
per-half verify outcomes appended to `data/t093-verify.jsonl`.

Two operational notes for future runs. First, the driver's `--conc` pool is
capped by the provider queue's `LLM_CONCURRENCY` env (default 1): the first
launch crawled serially at conc=64 until relaunched with
`LLM_CONCURRENCY=64`. Second, a relaunch overwrites `data/t093-report.json`
with its own (smaller) summary; `data/t093-verify.jsonl` is the append-only
source of truth.

### Run

Work list: 944 distinct items, 1077 flagged language halves (vocab-zh 809,
kanji-ja 119, grammar-zh 10, grammar-fr 5, grammar-ja 1). Round 1 at
conc=64: 1077/1077 halves, 302 re-rolls, 81 verify-fail residuals. Round 2
(ledger keys cleared for every half still flagged by an intermediate
validator run): 83 halves, 121 re-rolls, 25 recovered, 58 still failing.
Total 1580 sonnet calls (1557 fast-tier, 23 balanced-tier, both mapped to
sonnet via `LLM_MODEL_FAST=sonnet`; zero haiku, confirmed from `llm_calls`
after the first item and again at the end), ~2.76M output tokens, 423
re-rolls, wall clock ~35 min for both rounds. No rate-limit backoff, no
quota event.

The regen wave itself leaked some mechanical dirt into the fresh content
(30 markup_leak findings, ~450 em dashes outside the dead `hint_tr` field);
cleaned with the existing `scripts/fix-mechanical.mjs` against an
intermediate validator report, classes markup_leak + em_dash only.

### Acceptance (final validator run, committed as T-093-validator-after.json)

| Class | Before | After | Residual explanation |
| --- | --- | --- | --- |
| script_contamination:foreign_script | 48 | **0** | fully resolved |
| markup_leak | 0 | **0** | 30 wave-introduced leaks cleaned |
| headword_missing | 471 findings | 75 findings / 41 items | all explained, see below |
| pinyin_mismatch:syllable_mismatch (non-alternation) | 831 findings | 13 findings / 6 items | all explained, see below |
| em_dash outside dead hint_tr | n/a | **0** | wave-introduced ones cleaned |

Every remaining finding in the addressed classes was individually inspected
and is a validator precision limit, not a content error:

- **headword_missing (41 items)**: the checker requires the contiguous
  headword in every example/collocation. The survivors are grammatically
  correct forms the rule cannot represent: zh separable verbs (离合词:
  叹气 -> 叹了口气, 打官司 -> 打了三年官司), zh set phrases containing the
  characters non-contiguously (举动 -> 一举一动), and ja examples writing
  the taught kanji in kana per normal orthography (達 -> 私たち, 汁 ->
  そばつゆ). Each survived 6 sonnet attempts (3 per round) that kept
  producing natural, correct Chinese/Japanese.
- **syllable_mismatch (6 items)**: polyphone readings the word-level table
  lacks but that are correct in context: 得[děi] (modal), 吓[xià] (scare;
  table only has hè), 教[jiāo] (verb), a pattern annotation
  (跟…打官司[gēn…dǎ guānsi]), and 垃圾桶[lèsètǒng] inside a note that
  deliberately teaches the Taiwan pronunciation and states mainland lā jī
  is standard. Plus 34 findings in slash-alternation notation
  (X/Y[readingX/readingY]), already established by T-091 as a validator
  labeling quirk, not a defect.

### Item 3: the four named tone_only errors

All four fixed and verified gone: 周边 (zhōuweī -> zhōuwéi), 报纸 (báozhǐ ->
bàozhǐ), 模糊 (记忆模糊[jìyì mo hu] -> [jìyì móhu]) by targeted
`UPDATE ... replace()`; 斩钉截铁 (jiè -> jié) fixed by its regen since the
row was already in the target set.

### Remaining open (not this run)

- Item 2 product decisions: `bracket_overcovers_host` (7056),
  `sentence_in_one_bracket` (583), `unpaired_bracket` residual (6954).
- Item 4 validator precision: the pattern-slot bracket over-filing, plus the
  new evidence above (separable verbs, kana orthography, polyphone table
  gaps) that would make a polyphone-aware table worthwhile.
- `tone_only` (2992) and `latin_in_target` (213) stay low-priority residual
  as before; `em_dash` residual (2543) is entirely the dead `hint_tr` field.
