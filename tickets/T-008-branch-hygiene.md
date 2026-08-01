---
id: T-008
title: Branch push / PR decision
status: done
priority: p2
effort: S
confidence: high
depends: []
created: 2026-07-17
---

> **Deploy target note (amended 2026-07-27):** this ticket predates the okumo.dev migration; GitHub Pages references below no longer apply. The Pages mirror was removed 2026-07-27; okumo.dev (Cloudflare Worker) is the only deploy. See [T-045](T-045-backend-spike-skeleton.md) / [T-054](T-054-okumo-landing.md).

About 20 local commits have piled up on the feat/extendable-curriculum-full-grammar-save
branch (including all of today's work). Push/PR was never discussed.
Burak's call: merge to main, PR, or leave it as is?
Single-user personal project, so the PR ritual isn't required, but pushing is
valuable as a backup (via `gh`).

Closing (Jul 18 2026): decision = push directly to main, no PR. Also two
infrastructure fixes: (1) package-lock had broken for the third time due to
cross-platform optional deps loss; the last green CI lock was restored;
run `npm ci --dry-run` before every commit that touches the lockfile.
(2) The github-pages environment's branch policy only allowed
worktree-byo-llm-provider; NO deploy from main had ever succeeded (the live
site was serving the old branch); main was added to the policy, main deploys
are now green.
