---
name: doc-hygiene
description: Periodic documentation audit and cleanup; run when asked to "clean the docs", "doc hygiene", or check documentation for drift, contradictions, staleness, language, or sensitive content. Audits README, AGENTS.md, tickets/ and all other markdown, fixes what it can, and reports critical findings first.
---

# doc-hygiene

Periodic full-repo documentation audit. The goal: documentation that an agent
or a new contributor can trust blindly. Run it, apply the fixes, and summarize
to the maintainer WITHOUT pushing; the maintainer reviews and pushes.

## Standards to enforce

1. **Single source of truth, no drift.** `AGENTS.md` is the canonical
   instructions file; `CLAUDE.md` must contain nothing but a pointer/import to
   it. No fact may live in two places with two values. When two documents
   disagree (e.g. a README describing a removed feature), fix the stale one
   and leave an amendment note (rule 4).
2. **Currency, especially the README.** The README describes what the product
   does for a user, not the framework internals; keep tech details in
   AGENTS.md. Verify every claim against the current code/state of the
   project; anything you cannot verify, flag in the summary instead of
   silently keeping.
3. **English everywhere.** All repo documentation, tickets/backlog included,
   is written in English. The maintainer may prefer Turkish in conversation,
   but anything committed or pushed live must be English. Exceptions that
   stay Turkish: quoted product UI copy (tr is the canonical string table)
   and learner-facing content; the product itself remains Turkish + English.
   Also enforce the house punctuation rule: no em dashes (—) anywhere.
4. **Amendment convention (no silent history).** Historical documents may
   record decisions that were later reversed; that is fine, but it must be
   explicit. Mark the outdated statement "No longer applies; superseded by
   [X](link)". If a decision evolved through several stages (A -> B -> C ->
   D), each stage must link FORWARD to the next, linked-list style, so an
   agent landing on any stage is routed to the current one. Never delete the
   history; never leave it unmarked. Never invent a supersession you cannot
   support with evidence from the files themselves.
5. **Sensitive content sweep.** Grep all tracked text for credentials (API
   keys, tokens, client secrets, private keys, bearer strings, passwords),
   personal data that does not belong, and profanity/inappropriate content in
   both English and Turkish. Placeholders and documented example values are
   fine. Anything real: remove immediately and report it as the TOP finding
   (it may also require history scrubbing/rotation; say so).

## Procedure

1. **Inventory.** `git ls-files '*.md'` plus any docs-like files (design
   handoffs, reports). Note which are instruction files, product docs,
   backlog, or historical artifacts.
2. **Scan.** Read the key files (README, AGENTS.md, worker/other package
   READMEs, docs/); run the sensitive-content greps; sample the backlog for
   language and drift. Build a findings list: contradictions, stale claims,
   wrong-language files, em dashes, misplaced files (e.g. scratch reports in
   the repo root belong under docs/ with a dated name).
3. **Fix.** Apply the standards. For bulk mechanical work (translating many
   tickets, punctuation sweeps) fan out to parallel subagents with explicit
   file lists, full-fidelity rules, and the known supersession map; do the
   judgment-heavy files (AGENTS.md, README) yourself.
4. **Verify.** After all edits: grep for leftover em dashes and Turkish
   prose in supposedly-English files; re-run the sensitive-content grep;
   check links you added actually resolve to existing files.
5. **Summarize, do not push.** Report to the maintainer: critical findings
   FIRST (secrets, live contradictions an agent could act on), then the
   change list, then anything you could not verify or chose not to decide.
   Committing/pushing is the maintainer's call.
