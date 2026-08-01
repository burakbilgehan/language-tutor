---
id: T-009
title: "Phase 2b: local-first static build (browser SQLite + GitHub Pages)"
status: done
priority: p1
effort: XL
confidence: medium
depends: []
created: 2026-07-17
---

> **Deploy target note (amended 2026-07-27):** this ticket predates the okumo.dev migration; GitHub Pages references below no longer apply. The Pages mirror was removed 2026-07-27; okumo.dev (Cloudflare Worker) is the only deploy. See [T-045](T-045-backend-spike-skeleton.md) / [T-054](T-054-okumo-landing.md).

Phase 1 (BYO provider seam) + Phase 2a (llm-bridge) are done, in this
worktree/branch: `worktree-byo-llm-provider`. Remaining big piece: moving the
app to a static build and bringing all data into the browser, so the page
deployed from GitHub Pages can reach the user's localhost bridge / their own
API key from the browser (the server can't reach localhost; this is the only
way the bridge works after deploy).

Discovery verdict (2026-07-17, details in conversation history):
- 29 API routes (~1.8k LOC) will move into a client module; 13
  fetch("/api/...") call sites are the natural seam.
- better-sqlite3 -> wasm SQLite (OPFS): no architectural blocker, but ALL
  .sync()/.run() calls become async, the biggest mechanical cost.
- Business logic (SRS, answersMatch, conjugation, grammar-index...) is
  already pure, moves for free. jobs.ts's multi-process recovery simplifies
  under the single-tab model.
- Save format is a raw SQLite image, so it's a 1:1 fit for browser
  export/import.
- Strokes: 31MB copied from node_modules to public/ as a build step +
  on-demand fetch; JMdict 1.75MB fetch-on-demand.
- LLM: the existing http-provider also works in the browser (fetch-based);
  direct Anthropic calls will need the
  `anthropic-dangerous-direct-browser-access` header; the key moves to
  localStorage (no server for a config file).
- Bridge CORS is ready: `--origin https://<user>.github.io` + PNA header.

Proposal: start with a vertical-slice POC (review/SRS flow end-to-end on wasm
SQLite), then migrate the remaining routes with the same pattern.

---
CLOSING (2026-07-18): Done. sql.js came out SYNCHRONOUS (no async conversion
needed); all surfaces run through src/core/* against the browser DB; the
entire LLM loop, including chapter generation, works in static mode; GitHub
Pages is live: https://burakbilgehan.github.io/language-tutor/ (workflow:
pages.yml, NEXT_PUBLIC_BASE_PATH=/language-tutor). Setup wizard in T-010.
Remaining decision: merge to main + positioning static as the default (T-008).
