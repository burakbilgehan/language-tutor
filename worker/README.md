# worker/ — language-tutor backend (T-046, T-047)

Cloudflare Worker holding **identity** (better-auth, Google-only, sessions in
D1) and the **per-user save blob** in R2. T-045 was the spike that proved the
stack; T-046 hardened it; T-047 built real save-sync on top.

## Save-sync (T-047)

`GET`/`PUT /api/save`, authed, key `saves/{userId}/latest.db` derived from the
**session** — never from client input, so no user can address another's object.

The backend is deliberately **format-blind**: it stores an opaque byte string
plus an opaque version label. It never parses SQLite and never decides
compatibility; the client owns the save format. What the client uploads is a
**seed-stripped** image (content the CDN already serves is removed and
re-applied on pull), which measured 17.5 MB → 8.6 MB on the owner's real DB.

| Concern | Behaviour |
| --- | --- |
| Size cap | 30 MB. `Content-Length` missing → **411**; over cap → **413**, decided *before* `request.body` is touched (no R2 write, no streaming). |
| Lying `Content-Length` | Body streams through a `FixedLengthStream` pinned to the declared size. Overrunning it errors the write and the partial object is deleted. |
| `schemaVersion` | Client-declared, stored in R2 `customMetadata`, echoed on GET as `x-lt-schema-version`. A GET declaring a different version is refused **409** — via `head()`, so no egress and, crucially, before the client overwrites local data. |
| `updatedAt` | ISO timestamp in `customMetadata`, returned as `x-lt-updated-at`. Last-write-wins. |
| `HEAD` | Metadata only — returns early **before** `get()`, so a "what is in the cloud?" check costs no egress. Without that early return the runtime would drop the body only after R2 had served every byte. |

**Known hole in the server-side version gate, deliberately left:** the 409 fires
only when the stored version is non-empty *and* the client declared one. A blob
stored without a version (a T-045-era object, or a client that omits the header)
is served unchecked. That is safe rather than lucky: the client validates again
before swapping — `importBytes` → `validateSaveImage` refuses a wrong/absent
version, so an unloadable blob cannot replace live data. The server gate is
defence in depth and an egress saver, not the only check.

Why `customMetadata` and not D1: one write, no divergence window between blob
and version, and readable via `head()` without fetching the body. D1 would only
buy cross-user queries that manual push/pull does not need.

Why a `FixedLengthStream` rather than a counting `TransformStream`: R2's `put()`
rejects a stream of unknown length, and `pipeThrough` erases it. The
`TransformStream` variant broke *every* upload — caught by the suite, not by
reasoning.

`scripts/mint-dev-session.mjs` mints a signed session cookie against the local
D1 so `curl` can exercise the authed routes without a real Google sign-in. Sign
with better-auth's own `makeSignature` — it emits standard base64, and a
hand-rolled base64url signature silently resolves the session to `null`.

## Architecture

**Same-origin.** The Worker serves the static site AND `/api/*` from one
origin, so the session cookie is first-party. This is the whole reason the
cookie story is boring: `SameSite=Lax` suffices, there is no third-party-cookie
problem (Safari ITP), no `SameSite=None`, and no
bearer-token-in-localStorage (which would be XSS-readable). Static assets are
served by the runtime; `run_worker_first: ["/api/*"]` guarantees the API is
never shadowed by a same-named asset and that asset requests never spend Worker
CPU.

GitHub Pages stays as an **anonymous-only mirror** — no login, no sync. Its
workflow is untouched.

| File | Role |
| --- | --- |
| `src/index.ts` | Entry point. Splits `/api/*` (→ dispatcher) from assets. **No routing of its own** — a test enforces that. |
| `src/routes.ts` | The route table: the complete API inventory. `auth: "required"` handlers take an `AuthedCtx` that *contains* a session. |
| `src/dispatch.ts` | One pipeline: route lookup → origin gate → session → handler. Never touches `request.body`. |
| `src/origin.ts` | Origin allowlist + CORS/preflight. Parses `TRUSTED_ORIGINS` once. |
| `src/auth-options.ts` | The shared better-auth option fragment (binding-free). |
| `src/auth.ts` | better-auth instance, built per-request-scope, memoized per isolate. |
| `schema-gen.config.ts` | Node-only config for `@better-auth/cli generate`. |
| `test/` | The auth gate — see below. |

### Auth-before-execute is structural, not a convention

T-039's bug was "the handler ran before the auth check". Here that is
unrepresentable: an authenticated handler's context type includes a resolved
`session`, so it cannot be *called* without one. The dispatcher resolves the
session before the handler is reachable, and no body is read before that.
T-047's save routes inherit the property by construction — they just join the
table.

### Origin posture

- Untrusted `Origin` on any method → **403, before auth resolves** (so an
  attacker learns nothing about session state).
- Mutating method with **no** `Origin` header → 403. Browsers always send it on
  such requests; its absence means a non-browser client, which is exactly what a
  CSRF attack would imitate. Cost: **curl must pass `-H "Origin: …"`**.
- `OPTIONS` from an allowlisted origin → 204, echoing that exact origin
  (`*` is invalid with credentials). `Vary: Origin` on everything.
- The `/api/auth/*` exemption is narrow: **only the OAuth handshake**
  (`callback/*`, `sign-in/social`, `oauth2/*`) and **only for non-OPTIONS
  methods**. Those genuinely are cross-site — Google redirects the user to the
  callback — and better-auth guards them itself using the *same parsed list*.
  Everything else under `/api/auth/*` (notably `sign-out`) gets the full
  allowlist check. Two footguns closed here, both measured:
  - OPTIONS was originally exempt too, so preflights 404'd (better-auth's router
    does not answer OPTIONS) and browsers would have blocked the real request.
  - A cross-site `POST /api/auth/sign-out` from `evil.example` returned 200 and
    cleared the session cookies — forced-sign-out CSRF. Nuisance-grade (no data
    access), now 403.

Dev note: `localhost:3000` → `localhost:8787` is cross-**origin** (so it needs
CORS) but same-**site** (port is not part of a site), so `SameSite=Lax` cookies
still flow. Dev works without weakening production at all.

### Cookies

`useSecureCookies` is left **derived from `BETTER_AUTH_URL`**, never pinned.
Verified behaviour of the same option set:

| baseURL | cookie name | secure |
| --- | --- | --- |
| `http://localhost:8787` | `better-auth.session_token` | `false` |
| `https://…workers.dev` | `__Secure-better-auth.session_token` | `true` |

Note the **name changes** on https (better-auth adds the `__Secure-` prefix).
Anything reading the cookie by name must read
`ctx.authCookies.sessionToken.name` rather than hardcoding it —
`test/helpers/session.ts` does.

## Run it locally

```sh
cd worker
npm install
cp .dev.vars.example .dev.vars
npm run migrate:local     # applies migrations to local D1
npm run dev               # wrangler dev on :8787
```

`wrangler dev` and `wrangler d1 execute --local` are fully offline — miniflare
simulates D1 and R2. Do **not** run `wrangler d1 create` / `r2 bucket create`
locally; those need an authenticated account and are owner-only deploy steps.

`npm run schema:generate` regenerates the D1 schema from `schema-gen.config.ts`.

## Tests

```sh
npm test        # vitest + @cloudflare/vitest-pool-workers (real workerd)
npm run typecheck
```

**The auth gate** (`test/auth-gate.test.ts`) is the Worker's answer to the Next
app's `src/lib/auth.test.ts`. That one textually scans `route.ts` files; that
shape does not transfer to a single-dispatcher Worker, so this gate is instead a
*runtime* check:

- every route is `auth: "required"` or justified in `OPEN_ROUTES`;
- no mutating route is open;
- each authed route, fetched with no session, returns **401**;
- an unauthenticated `PUT /api/save` leaves **R2 unchanged** (criterion 3
  verified, not asserted);
- forged/garbage session cookies are rejected (the HMAC is really checked);
- `src/index.ts` contains no path matching — i.e. nobody can add a route that
  bypasses the table.

Adding an unauthenticated mutating route fails the first two; adding one
directly in `index.ts` fails the last. Both were demonstrated red before
shipping.

`test/set-cookie.test.ts` guards the one path that **cannot** be exercised
locally. The dispatcher re-wraps every response to attach CORS headers, and a
`Headers` copy can collapse multiple `Set-Cookie` values into one — which would
silently break the real Google callback (the response most likely to carry two).
Verified it does not.

**Sessions in tests** are minted through better-auth's internal adapter with a
hand-signed cookie (`test/helpers/session.ts`), because Google is the only
provider and there is deliberately **no** signup endpoint to call. Test-only
secrets live in `vitest.config.ts`, which `wrangler deploy` never reads — so
test configuration cannot reach production. The suite passes with `.dev.vars`
absent (verified), so it works on a fresh clone.

## Verified (curl against `wrangler dev` + suite, 2026-07-26)

| Check | Result |
| --- | --- |
| `GET /` (static asset) | `200 text/html` — same origin as the API |
| `GET /api/health` no Origin | `200 {"ok":true}`, no CORS headers needed |
| `PUT /api/save` Origin `evil.example` | `403 origin_not_allowed` |
| `PUT /api/save` no Origin | `403 origin_required` |
| `OPTIONS /api/save` from `evil.example` | `403`, **no** `Allow-Origin` header |
| `OPTIONS /api/save` from `localhost:3000` | `204` + exact origin + `Allow-Credentials` |
| `OPTIONS /api/auth/sign-in/social` from `localhost:3000` | `204` (was `404` — fixed) |
| `POST /api/auth/sign-in/social` from `localhost:3000` (cross-origin) | `200` + `Allow-Origin: http://localhost:3000` |
| `POST /api/auth/sign-out` from `evil.example` | `403` (was `200` + cookies cleared — fixed) |
| `POST /api/auth/sign-out` same-origin | `200`, two `Set-Cookie` headers preserved |
| `PUT /api/save` allowed origin, **no session** | `401` |
| R2 after those rejected PUTs | **empty** — no side effect |
| `GET /api/auth/get-session` w/ signed cookie | session + user resolved from D1 |
| `PUT`/`GET /api/save` w/ session | round-trips; key `saves/<userId>/latest.db` |
| second user `GET /api/save` | `404` on **its own** key — never user A's blob |
| **T-047** `PUT` real 8.55 MB stripped blob | `200`, `bytes: 8962048` |
| `GET` it back | **byte-identical** (same SHA-256), `content-length` + version/updatedAt headers |
| `GET` declaring version 8 vs stored 7 | `409 save_version_mismatch` |
| `PUT` 35 MB body (cap 30 MB) | `413 too_large`; the stored save is **unchanged** (hash re-verified) |
| `PUT` chunked, no `Content-Length` | `411 length_required` |
| unauthed `PUT` then re-`GET` | `401`, stored blob byte-identical — no side effect |
| pulled blob | `PRAGMA integrity_check` = ok, 3 profiles, 554 grammar rows `pending` (awaiting CDN refill) |
| `POST /api/auth/sign-up/email` | `400 EMAIL_PASSWORD_SIGN_UP_DISABLED` |
| `POST /api/auth/sign-in/magic-link` | `404` — plugin removed |
| `POST /api/auth/sign-in/social` (google) | `200` → `accounts.google.com` with `state` + PKCE `code_challenge` |
| `GET /api/auth/callback/google` | `302` — reaches better-auth, not blocked by our gate |
| Set-Cookie on http dev | `HttpOnly; SameSite=Lax`, no `Secure` (correct for http) |

**Not verified here (blocked on owner setup):** a real Google sign-in roundtrip
(needs a real OAuth client) and a real deploy (needs a Cloudflare account).

## Deploy (owner steps)

Everything below needs an authenticated Cloudflare account and is intentionally
not automated.

Production lives in the `env.production` block of `wrangler.jsonc`: worker name
`okumo`, custom domain **okumo.dev** (bought via Cloudflare Registrar, zone on
this account), `../out` assets, prod origins. The top-level block stays
localhost/placeholder — it is what `wrangler dev` and the test suite read.

1. **Create resources** and paste the printed D1 id into the `env.production`
   d1 block (replacing the all-zeros placeholder):
   ```sh
   npx wrangler d1 create lt-auth
   npx wrangler r2 bucket create lt-saves
   npx wrangler d1 migrations apply lt-auth --remote --env production
   ```
2. **Secrets** (never in `wrangler.jsonc`, which is committed):
   ```sh
   npx wrangler secret put BETTER_AUTH_SECRET --env production   # openssl rand -base64 32
   npx wrangler secret put GOOGLE_CLIENT_ID --env production
   npx wrangler secret put GOOGLE_CLIENT_SECRET --env production
   ```
3. **Google OAuth client** (Cloud Console → Credentials → OAuth client ID, type
   "Web application"). Authorized redirect URIs, exactly (localhost one keeps
   the local round-trip testable with the same client):
   ```
   https://okumo.dev/api/auth/callback/google
   http://localhost:8787/api/auth/callback/google
   ```
   (Verified path — it is what the sign-in redirect actually requests.)
4. **Static assets.** `env.production` points at `../out`. Build it at the repo
   root with a plain `npm run build:static`, **without** `NEXT_PUBLIC_BASE_PATH`.
   That variable is set only by `.github/workflows/pages.yml` (for the
   `/language-tutor` project path), so a local build is already root-relative —
   but do not reuse a Pages-built `out/`, or every asset URL will be off by one
   path segment.
5. `npx wrangler deploy --env production`. The custom-domain route attaches
   okumo.dev on first deploy (DNS + cert are automatic on the zone).

## Notes / risks

- `@better-auth/cli` (devDependency, used only by `schema:generate`) pulls
  advisories via `prisma-ast`/`chevrotain`. It never enters the Worker bundle.
  Kept as a pinned devDependency rather than `npx @better-auth/cli@latest` so
  schema generation is reproducible; drop it if the audit noise is not worth
  that.
- Removing `emailAndPassword` and `magicLink` produced a **byte-identical**
  migration. `verification` is core OAuth-state (not magic-link) and
  `account.password` is unconditional, so `0001` is unchanged.
- better-auth registers the email endpoints unconditionally and refuses at
  runtime when disabled — hence `400 EMAIL_PASSWORD_SIGN_UP_DISABLED`, not
  `404`. The test asserts that error code, so re-enabling the provider breaks
  the suite.
