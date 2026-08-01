---
id: T-046
title: Auth - better-auth (Google + magic-link) on the Worker, security-gated
status: done
priority: p1
effort: L
confidence: medium
depends: [T-045]
created: 2026-07-26
---
Once the spike (T-045) verified the stack, build auth to production quality.
Scope: **identity**, not save-sync (that's T-047).

- **Providers:** Google OAuth + magic-link (email). Apple/Facebook deferred to
  v2 (Apple's $99/year dev account, Facebook app review; too much overhead to
  start).
- **Session/user:** in D1 (better-auth D1 adapter). User <-> account mapping.
- **Magic-link sender:** the email provider chosen in T-045 (CF Email Sending /
  Resend) gets wired to prod.

**Cookie/domain decision (advisor, MUST be resolved, cannot be deferred):**
site public origin + Worker on a different registrable domain = third-party
session cookie (Safari ITP blocks it, Chrome is tightening too). Options: (a)
custom domain, app+API on the same registrable domain (`app.x.com`/`api.x.com`,
`SameSite=Lax` works); advisor's recommendation, cheapest, and desirable before
monetization anyway; (b) CF Pages + Worker on the same origin route; (c)
bearer-token-in-localStorage (XSS-readable, AVOID). Decision goes to Burak:
**will a custom domain be bought?**

**Security acceptance criteria (same threat class as T-039, NOT review-later):**
the Worker is an authenticated API called from a public browser origin, the
same shape as the bridge CSRF issue. (1) Strict origin allowlist; (2)
`SameSite` on the session cookie; (3) state-changing routes must not run
before the auth check (T-039's bug was exactly this: "handler ran before
auth"); (4) `src/lib/auth.test.ts` only walks Next `route.ts` files, so the
**Worker needs its own test gate** (every mutating Worker route must do an
auth check, locked by a test).

Fence (same Worker codebase as T-047): `worker/` (T-045's skeleton; top-level
`worker/` directory, NOT `src/worker`; has its own package.json/lockfile).
Run SERIALLY with T-047 or fence-split in parallel with **auth merged first**.

**T-046 implementation decisions (2026-07-26, owner decision + implementation):**
- **Google-only.** Magic-link is out of scope (no custom domain means no email
  provider can send). `emailAndPassword` was also removed (it was an open
  signup endpoint in the spike).
- **Cookie/domain question resolved via same-origin:** the Worker serves both
  the static site and `/api/*` from a single origin (Workers static assets +
  `run_worker_first: ["/api/*"]`). The session cookie is first-party, so
  `SameSite=Lax` is enough; the third-party cookie / ITP problem disappears.
  No custom domain needed. GitHub Pages stays as an anonymous-only mirror.
- **Auth-before-execute baked into the type system:** `src/routes.ts` is a
  route table; an authed handler's context type INCLUDES a resolved `session`,
  so it can't be called without one. T-047's save routes inherit this
  automatically by joining the table.
- **Worker test gate** (`worker/test/`, vitest-pool-workers, real workerd):
  stronger than Next's textual scan; it walks the route table and fires an
  actual unauthenticated request, verifying 401 + **no side effect in R2**;
  it also catches a table-bypass route in `index.ts`. Both were shown red
  before the fix.
- **Bug found + fixed:** exempting `/api/auth/*` from the origin gate caused
  OPTIONS preflight to return 404, which blocked the browser's dev sign-in.
  OPTIONS is no longer exempt (preflight carries no cookie/body, so the
  callback GET is unaffected).
- Schema regenerated: **byte-identical** (verification = core OAuth state,
  not magic-link-specific), so `0001` didn't change.

Notes after T-045 (2026-07-26): (1) better-auth >= 1.6 accepts a raw D1
binding directly; the `kysely`/`kysely-d1` deps are unused, remove them. (2)
`emailAndPassword: { enabled: true }` was a spike-only open signup endpoint,
remove it. (3) There's NO CORS/preflight on the Worker (invisible via curl,
mandatory in a browser; credentialed CORS is required under every domain
option). (4) `schema-gen.config.ts` manually mirrors `src/auth.ts`'s
plugin/provider set, a drift risk, keep them in sync. (5) **A custom domain
turned out to be a prerequisite for magic-link** (no provider sends to an
arbitrary recipient without a domain); without a domain, scope falls back to
Google-only.
