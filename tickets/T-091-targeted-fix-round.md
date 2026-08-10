---
id: T-091
title: Targeted fix round driven by the T-087 validator report
status: backlog
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
