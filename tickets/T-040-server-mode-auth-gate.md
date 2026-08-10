---
id: T-040
title: Server-mode env-token auth gate (blocker before going public)
status: done
priority: p1
effort: M
confidence: high
depends: []
created: 2026-07-22
---
**No longer applies; superseded by [T-069](T-069-kill-server-static-duality.md)
(2026-08-10):** the server runtime this gate protected was removed; the gate,
`src/lib/auth.ts` and the `auth.test.ts` route-walker are gone. Successor
invariant: `src/lib/runtime-purity.test.ts`.

**Scope narrowed (2026-07-26):** This ticket = the env-token gate
(proportionate closure). Real multi-tenant isolation (per-user DB /
profile ownership, tenanting the job IDOR) -> split off to **T-043**
(gated on the monetization model, XL, deferred). An env-token gate is the
correct move for any public pivot shape; a multi-tenant foundation would
be needless over-build today.


T-026 wave 5 finding. **Threat frame B (public/monetize threshold)**;
not exploitable today (the live deploy is static/Pages, `/api/*` routes
are stripped by `build-static.mjs:15`; server mode is localhost
single-user). **But the moment server mode opens beyond localhost, it's
a blocker.** The finding passed fable-verifier. **Verdict: CONFIRMED
(mechanism), urgency limited by the reality of the static deploy.**

Root cause: no server route has auth (no `middleware.ts` in the repo, no
`getServerSession`/`cookies`/`requireAuth` primitive) and there's a
single global DB (`src/db/index.ts` DB_PATH, no per-user tenancy; all
multi-*profile* belongs to the owner, not multi-*tenant*). The two
sharpest routes:
- **GET /api/save/export** (`src/app/api/save/export/route.ts:5`): an
  unauthenticated request returns the entire `data/app.db` (every
  profile, all progress); full exfiltration.
- **POST /api/save/import** (`src/app/api/save/import/route.ts`): an
  unauthenticated request mutates the shared DB for everyone
  (`import.ts:97` tmp->DB_PATH rename). The write half of S1 (a
  malicious import trigger).

But the problem isn't limited to these two routes: every mutating/LLM
route (curriculum generate, grammar/kanji/vocab batch, chat, translate)
is unauthenticated -> once open, quota-burn + data access. This is the
"an auth layer is a big enough item for its own ticket" item T-026
anticipated.

The repo's own code justifies this scenario:
`src/lib/llm/config.ts:31-35`'s `cliAllowed()`/`LLM_CLI_DISABLED` exists
exactly so "a hosted instance's guests can't burn the owner's Max sub";
meaning the author was already anticipating a guest-accessible server
deploy. But `LLM_CLI_DISABLED` ONLY gates CLI-provider construction
(config.ts:34), it does nothing for `/api/save/*` or other routes. The
auth gap is unowned (the README doesn't even point the operator to "add
auth").

Suggested direction: a minimal identity layer for server mode; e.g. an
env-based single token (`APP_AUTH_TOKEN`) + a `requireAuth()` middleware
wrapping all mutating/exfil routes; or full multi-tenancy (per-user DB /
profile ownership) if monetization becomes real multi-user. The decision
depends on the shape of the public pivot. Large scope -> can be split
into sub-parts (route inventory -> token gate -> tenant isolation).

Defense-in-depth riders (cheap alongside this ticket): **S2**; add a
magic-header pre-check to server import (`save-image.ts:63` has it in the
browser, not on the server; near-noise but cheap). The job route IDOR
(T-034, `core/jobs.ts:78` "NO profile scoping") should be tenanted within
this ticket's scope.

---

**Closing (2026-07-26):** Env-token gate shipped.

- `src/lib/auth.ts`; a `requireAuth(req)` guard (in the shape/style of
  `requireLlm()`, 401 + a stable `unauthorized` code), driven by
  `APP_AUTH_TOKEN`. The token can be presented via `Authorization: Bearer`
  OR the `lt_auth` cookie. Comparison via `timingSafeEqual` over a
  SHA-256 digest (constant-time; comparing raw buffers throws on a length
  mismatch, and a bare length check also leaks length).
- **APP_AUTH_TOKEN unset/empty -> complete no-op.** The localhost
  single-user flow is byte-for-byte identical; verified live (export
  returned 18MB, PATCH profile, stats, fixture LLM route all 200;
  `/api/auth` 404s while the gate is off = inert).
- `GET /api/auth?token=…` bootstraps the cookie. The cookie isn't
  optional, it's mandatory: save export navigates via
  `window.location.href` (client-api.ts:562), which can't carry a header.
  HttpOnly + SameSite=**Strict** (not Lax; the cookie also authorizes
  mutating routes, a cross-site POST /api/save/import shouldn't carry the
  cookie; the CSRF class T-039 fights) + Path=/ + Secure only on https
  (otherwise it would break http://localhost).
- ALL route methods are gated except `GET /api/health/llm` (three
  booleans, client gating) and `GET /api/strokes/[char]` (vendored public
  stroke dataset). `requireAuth` is the FIRST statement in every handler;
  before `requireLlm()` and before `req.json()/formData()` (otherwise an
  unauthenticated call would get a 100MB upload parsed and leak whether
  the LLM is configured).
- `src/lib/auth.test.ts`'s sweep turns this into an **invariant**: it
  walks every `src/app/api/**/route.ts`, failing the suite if a method
  isn't gated (verified with a negative control). A new route can't
  silently ship ungated.

No schema change, no SAVE_SCHEMA_VERSION bump, static mode untouched.

**Deliberately out of scope:** the S2 server-import magic-header rider ->
T-041 (owned by `src/lib/save/import.ts`). Job route IDOR tenanting /
per-user DB / profile ownership -> T-043.
