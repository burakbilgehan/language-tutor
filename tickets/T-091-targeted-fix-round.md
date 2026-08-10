---
id: T-091
title: Targeted fix round driven by the T-087 validator report
status: done
priority: p1
effort: M
confidence: medium
depends: [T-087]
created: 2026-08-10
---
Consume the machine-readable report from T-087 and repair the mechanically
detectable error mass across the full corpus, in `data/app.db` only:

1. LLM-free leg: wrong bracket pinyin rewritten from the reading table;
   malformed brackets normalized to per-word form; leaked markup stripped
   (or the field nulled when the remainder is garbage); em dashes replaced
   per AGENTS.md.
2. LLM leg (owner-gated, decide AFTER seeing the counts): items whose
   defects cannot be repaired mechanically (examples missing the headword,
   wrong glosses flagged by containment/contamination heuristics) get
   targeted sonnet regeneration, T-090 style.

The split and the go/no-go for the LLM leg are Burak's call once the T-087
counts are on the table; do not start the LLM leg unprompted. If the
residual (post-mechanical) error rate stays high, the fallback discussed in
the audit report (wholesale regeneration of the weak surfaces at sonnet
tier) becomes its own ticket.

Scope guard: `data/app.db` only; no seed export, no deploy (T-092).

Acceptance: re-running the T-087 validator after the fix leg(s) reports
zero (or explained-residual) findings in the addressed classes.

## Result

Done 2026-08-10, mechanical leg only. The LLM leg was pre-approved with an
800-item guardrail; the actual candidate count came in at 944 distinct items,
so per the guardrail the leg was stopped before starting and is reported
below rather than run. Everything else in scope was completed.

### Step 0: fresh baseline

The committed T-087 report predates the T-089/T-090 regeneration, so a fresh
snapshot was taken from the live `data/app.db` (`sqlite3 ".backup"`, then
`PRAGMA journal_mode=DELETE` for the validator's readonly open) and
`scripts/validate-content.mjs` was re-run against it before any fix work.
Fresh baseline: 36450 findings (vs. 36561 in the stale committed report; the
small delta is entirely T-089/T-090's regenerated rows). All work below is
against this fresh baseline, not the stale one.

### Mechanical leg (`scripts/fix-mechanical.mjs`, new script, LLM-free)

New driver, not a modification of `validate-content.mjs` or
`regen-content.ts` (both untouched, per the scope fence). It re-derives every
transform from the LIVE row's current `content` column (never from the
validator snapshot), so a concurrent change to a row can never be silently
clobbered by a stale rewrite. Verified end to end on a disposable copy of the
snapshot first (fixer + a fresh `validate-content.mjs` run against the fixed
copy) before touching the live DB once; the live run produced byte-identical
counts to the verified copy.

Per-class fixed / residual, findings-level (before -> after; the after
numbers also live in `tickets/T-091-validator-after-summary.md`):

| Class | Before | Fixed | After | Residual reason |
| --- | --- | --- | --- | --- |
| markup_leak | 32 | 32 | 0 | fully resolved |
| em_dash | 10491 | 7735 | 2756 | all residual is `chars[].hint_tr` (dead field since T-088, skipped on purpose, not fixed) |
| bracket_shape | 19857 | 4675 | 15162 | see breakdown below; `bracket_overcovers_host` (7927) and `sentence_in_one_bracket` (573) deliberately untouched, `unpaired_bracket` partially stripped (11354 -> 6662) |
| pinyin_mismatch | 5338 | 1212 | 4121 | `tone_only` (3224, deliberately unfixed, see verdict below) + `syllable_mismatch` residual (897, ambiguous/polyphone, routed to the stopped LLM leg) |
| headword_missing | 471 | 0 | 471 | not mechanically fixable; was routed to the stopped LLM leg |
| script_contamination | 261 | 0 | 259 | not mechanically fixable (2-item drop is incidental, see note below); was routed to the stopped LLM leg |

Rows updated in `data/app.db`: 3012 (out of 5376 rows carrying at least one
finding in a handled class). Two findings (`script_contamination:foreign_script`
50->48, `pinyin_mismatch:tone_only` 3229->3224) moved as an incidental side
effect of the markup_leak strip removing text that happened to also contain a
flagged character/bracket; neither is claimed as an intentional fix.

**1. markup_leak (32/32 fixed).** All were a leaked tool-call fragment
(`<parameter ...>` or a stray `</note_tr>`/`</invoke>` closing tag) appended
after otherwise-clean prose in `note_tr` (31, vocab-zh) or `intro_tr` (1,
grammar-nl). Every case had recoverable clean content before the leak
started, so all 32 were stripped, none nulled as garbage.

**2. pinyin_mismatch:syllable_mismatch (1212/2109 fixed, high confidence
only; `tone_only` untouched, see below).** Rewritten from the reading table
per the disambiguation rule: exact word-level reading first
(`vocab_entries.reading` / `zh-data.json`), else per-character concatenation
only when every host character is single-reading in the table. Skipped (897,
routed to the LLM leg / documented residual): 33 are legitimate `X/Y[readingX/readingY]`
alternation notation (跟/和[gēn/hé], 谁[shéi/shuí]) that the validator's
single-token host capture cannot represent and that a naive rewrite would
have corrupted by silently dropping one of the two valid readings; the rest
are genuine per-character ambiguity (polyphones with no word-level table
entry) where the spec's "never guess a polyphone" rule applies.

**3. bracket_shape (4675/19857 fixed).** `empty_bracket`: all 3 stripped
(`[]` removed from the host). `unpaired_bracket` (11354 total): stripped only
when the orphan bracket immediately follows sentence-final punctuation
(`。！？!?`, after trimming whitespace) AND its inner text plausibly reads as
a pinyin/kana reading (tone diacritic, kana, or an internal space) rather
than prose -- 4692 stripped, 6662 left as residual. The residual splits into
three shapes, none of which the spec's "whole-sentence reading after final
punctuation" clause covers:
  - roughly 4.5k are a CJK word followed by a *space* then `[pinyin]`
    (`按照 [ànzhào]`) -- the renderer only fails to pair these because of the
    space, not because they're a sentence dump; closing the gap would make
    them pair and render correctly, but `FURIGANA_RE` takes the WHOLE
    preceding CJK run as host, so closing a gap next to other hanzi would
    manufacture a fresh `bracket_overcovers_host` finding (the class the
    spec explicitly fences off). Left as a follow-up, not touched here.
  - a smaller bucket is the validator's own `looksLikeReading` heuristic
    (`/^[a-zA-Z...]+$/`) over-filing legitimate pattern-slot bracket notation
    used in grammar prose (`[Thing/Person]は[Place]`, `[Yer]に[Varlık]`) as if
    it were a broken reading. This is a validator precision bug, not a
    content defect; not fixed here (scope fence forbids editing
    `validate-content.mjs`), noted as a follow-up for that script.
  - the remainder sits after mid-sentence punctuation (，、；：) rather than
    true sentence-final punctuation, outside the spec's "final punctuation"
    wording; left as residual.
  `sentence_in_one_bracket` (573): NOT stripped. These are PAIRED brackets
  (attached to a real, if too-short/wrong, host), not orphans -- verified
  0/573 readings actually end in sentence-final punctuation, so the spec's
  strip clause (written for the orphan/after-final-punctuation shape) does
  not describe this severity's actual data shape. Stripping would delete a
  reading from a host that has one rather than remove genuine literal-text
  garbage; left as a documented residual pending a product decision.
  `bracket_overcovers_host` (7927): untouched by design, per the spec
  ("display imperfection, pinyin correct; goes to the backlog note instead").

**4. em_dash (7735/10491 fixed).** Replaced per AGENTS.md style: a spaced em
dash (`" — "`) becomes `"; "`, an unspaced one (`"word—word"`) becomes
`", "`, with cleanup of any double punctuation the substitution could create.
Skipped 2756 occurrences inside `chars[].hint_tr` on purpose: that field
stopped being rendered or requested as of T-088, so fixing it would be a
wasted write to dead data. All fixed occurrences are outside `hint_tr`.

**5. pinyin_mismatch:tone_only -- sampled, not fixed wholesale.** 30 findings
sampled with a fixed seed (42) out of 3229 and hand-judged against standard
Mandarin pinyin:

- 4/30 (13%) are genuine dropped/misplaced tones: vocab 周边 note_tr
  (周围[zhōuweī], tone mark on the wrong vowel, should be zhōuwéi), vocab 报纸
  en collocation (报纸上[báozhǐ shang], báo "thin" written instead of bào
  "newspaper"), vocab 斩钉截铁 self-reading (jiè written for 截's real jié),
  vocab 记忆模糊 host (模 should keep its tone2 as mó, written fully toneless).
- 3/30 (10%) are borderline: standard colloquial neutral-tone reduction
  (报酬 bàochóu/bàochou, 没有 méiyou/méiyǒu, 观众掌声 zhǎngsheng/zhǎngshēng)
  that dictionaries attest both ways; not actually wrong.
- 23/30 (77%) are confirmed table artifacts: overwhelmingly 个/一个 (a
  measure word whose neutral tone is correct grammar, not a dropped tone)
  plus a few words missing from the word-level reading table.

Verdict: the real error rate in this bucket is low (~13%, ~23% counting
borderline cases), matching T-087's own characterization of `tone_only` as
systemic/table-noise rather than a reliable defect signal. Not fixed
wholesale -- an automated rewrite would corrupt far more correct neutral-tone
content (the 个/一个 majority) than it would repair. Follow-up: the 4 named
real errors above are small enough to hand-fix directly if wanted; otherwise
this class stays permanently low-priority residual unless the reading table
is upgraded to a proper polyphone-aware dictionary (its own future ticket).

### LLM leg: stopped at 944 > 800

Per-class candidate count for the LLM leg (distinct items, computed against
the post-mechanical-fix state):

| Source | Distinct items |
| --- | --- |
| headword_missing | 345 |
| script_contamination:foreign_script | 43 |
| pinyin_mismatch:syllable_mismatch (ambiguous, non-alternation) | 589 |
| fields nulled as garbage in step 1 that are load-bearing | 0 (no garbage nulls occurred; every markup_leak fix left recoverable clean content) |
| **union (distinct items across all sources)** | **944** |

944 exceeds the pre-approved 800-item guardrail, so the leg was stopped
before any generation call and is reported here per the owner's instruction,
not run. Independently: even the highest-value subset alone (345
`headword_missing` + 43 `script_contamination` = 388 items = 776 language
halves) at the T-089/T-090 driver's conc=16 pace (~80s/call observed in
T-089) is roughly 65 minutes wall-clock, which does not fit inside the
22:30 finish-by window either, so both the count gate and the clock gate
independently say no-go. `headword_missing` items are not sub-prioritized by
`allMissing` inside this leg because the leg was never started; the 18
`allMissing` items would be the natural first slice of a follow-up run.

### Step 3: post-fix validator

Re-ran `scripts/validate-content.mjs` against a fresh post-fix snapshot of
the live DB. Committed as `tickets/T-091-validator-after.json` (22769
findings, down from 36450, a 37.5% reduction) and
`tickets/T-091-validator-after-summary.md`; the original T-087 artifacts are
untouched. Both files checked for raw U+2014 before commit (per the T-087
Result's known fragility note that only `excerpt()` escapes it): zero raw
occurrences in either file.

Acceptance re-read: `markup_leak` reaches zero (fully resolved). Every other
addressed class reaches an explained residual as detailed above, none of
which is a silent gap: `em_dash` (hint_tr, dead field), `bracket_shape`
(three sub-shapes outside the spec's strip clause, all documented, plus the
two classes explicitly fenced off), `pinyin_mismatch` (`tone_only` sampled
and judged not worth a wholesale fix; `syllable_mismatch` residual routed to
the stopped LLM leg), `headword_missing` and `script_contamination` (both
require content generation, routed to the stopped LLM leg).

### Follow-ups (not done here, out of this ticket's scope fence)

1. **LLM leg re-run** (944 items, `headword_missing` 345 + `script_contamination:foreign_script`
   43 + ambiguous `pinyin_mismatch:syllable_mismatch` 589): needs its own
   pass, ideally split so the two mechanically-cheap-to-verify classes
   (headword_missing, script_contamination, 388 items) run first and the
   pinyin polyphone cases (589 items, harder to machine-verify) run
   separately or get deprioritized.
2. **`bracket_overcovers_host` (7927, untouched by design)**: needs a product
   decision, not a data fix -- the pinyin is correct, only the ruby-span
   rendering is wrong (`FURIGANA_RE` takes the whole preceding CJK run as
   host). Fix belongs in the renderer/regex, not per-row.
3. **`unpaired_bracket` residual (6662)**: three sub-shapes, see the
   bracket_shape section above. The ~4.5k space-gap cases are the most
   promising ("按照 [ànzhào]" -> "按照[ànzhào]") but need the renderer's host
   capture fixed first (or a smarter gap-closer that checks the character
   before the gap isn't itself part of a longer CJK run) so the fix doesn't
   just trade one bracket_shape finding for a bracket_overcovers_host one.
4. **`validate-content.mjs` precision bug (not fixed, scope fence)**:
   `looksLikeReading`'s all-Latin heuristic over-files legitimate
   pattern-slot grammar notation (`[Thing/Person]は[Place]`, `[Yer]に[Varlık]`)
   as `unpaired_bracket`. Worth a validator-side allowlist for bracket inner
   text that is a single capitalized word/short phrase used as a template
   placeholder, in a future pass over that script.
5. **`sentence_in_one_bracket` (573, untouched)**: needs a product decision
   on whether to strip the wrong/too-short-host reading entirely (removing a
   ruby that IS shown, even though it's misattached) or leave it; not a
   mechanical call.
6. **`tone_only` (3224, sampled not fixed)**: 4 confirmed real errors named
   above are cheap hand-fixes if wanted; the class as a whole needs a
   polyphone-aware reading table (CC-CEDICT-style) before a wholesale fix is
   safe.
7. **`pinyin_mismatch` slash-alternation items (33)**: not defects, a
   validator labeling quirk (single-token host capture can't represent
   `X/Y[readingX/readingY]`); no action needed, noted so a future run
   doesn't misread them as unresolved.

### Scope confirmation

Writes went only to `data/app.db` (live), via UPDATE statements inside a
single connection with `busy_timeout` set; no DELETE/DROP. No seed
re-export, no deploy, `tickets/INDEX.md` untouched. New script:
`scripts/fix-mechanical.mjs` (T-091-specific, does not modify
`scripts/validate-content.mjs` or `scripts/regen-content.ts`).
