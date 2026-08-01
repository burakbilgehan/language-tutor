---
id: T-059
title: Bridge blackboxing - npx package + /health + opencode decision
status: done
priority: p2
effort: M
confidence: high
depends: []
created: 2026-07-27
---
> **REVISED (2026-07-31, Burak decision):** the npm package will NOT be
> published. The package was never published, and the wizard's
> `npx okumo-bridge` command was a 404 for everyone (2026-07-28 field finding
> #1). Decision: the primary setup path is curl/iwr + `node llm-bridge.mjs`
> (from the site, an origin the user already trusts; npm would add a second
> supply-chain surface + a separate release step). `packages/okumo-bridge/`
> stays in the repo as an ARCHIVE skeleton; if okumo grows large enough to be
> referenced in third-party docs, publishing gets reconsidered that day.
> Item 1 of the scope below is invalidated by this revision; the /health and
> opencode parts stayed valid.

Burak decision (2026-07-27): the bridge stays (he uses it himself), but the
flow becomes a single command instead of "curl download + node run," and the
site will be able to live-detect the bridge (detection UI is T-060, this
ticket is the infrastructure).

## Scope
1. **npm package `okumo-bridge`**: `scripts/llm-bridge.mjs` wrapped in a
   package with a bin entry, so the user's command becomes
   `npx okumo-bridge` (+ `--backend`, `--origin` unchanged). Version-pinned;
   `llm-bridge.mjs` served from the site STAYS as a fallback (for those
   without or unwilling to use npm registry access). Ops: npm publish from
   Burak's account, a release step added to the README.
2. **`GET /health`**: returns `{ ok, backend, cliFound }` (`cliFound` = is
   the backend CLI on PATH, a cheap `which`; CLI login state can't be known
   without making a call, and isn't claimed). T-039's rules apply UNCHANGED:
   host allowlist + origin gate + PNA header also for /health; the probe
   comes from the site, no leak to origins outside the allowlist.
3. **opencode decision**: the bridge supports 5 backends, the wizard shows
   4. Decision: opencode stays in the bridge, doesn't surface in the main
   flow; documented as an "other backends" line in T-060's advanced panel.

Fence: `scripts/llm-bridge.mjs` + a new package directory
(`packages/okumo-bridge/` or a minimal structure wrapping the script, chosen
during the session) + build-static's copy step is preserved. Doesn't touch
app code, so safe to run in parallel with T-057.
