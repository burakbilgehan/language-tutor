---
id: T-093
title: T-091 LLM leg (944 items) + residual content decisions
status: todo
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
