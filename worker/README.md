# worker/ — T-045 backend spike

Minimal Cloudflare Worker proving the T-046/T-047/T-048 stack end to end:
**session → authenticated request → per-user R2 blob**, all on local bindings
with **no Cloudflare account**.

This is spike code. T-046 hardens it (origin allowlist, CSRF, auth test gate).

## Run it locally

```sh
cd worker
npm install
cp .dev.vars.example .dev.vars
npm run migrate:local     # applies migrations/0001_better_auth.sql to local D1
npm run dev               # wrangler dev on :8787
```

`wrangler dev` and `wrangler d1 execute --local` are fully offline — miniflare
simulates D1 and R2. Do **not** run `wrangler d1 create` / `r2 bucket create`
locally; those need an authenticated account and are owner-only deploy steps.

## Verified end to end (curl, 2026-07-26)

| Step | Result |
| --- | --- |
| `PUT /api/save` with no session | `401` |
| `POST /api/auth/sign-up/email` | `200` + `Set-Cookie: better-auth.session_token=…; HttpOnly; SameSite=Lax` |
| `GET /api/auth/get-session` | session + user resolved from D1 |
| `PUT /api/save` (1 byte) | `{"ok":true,"key":"saves/<userId>/latest.db"}` |
| `GET /api/save` | returns the byte back from R2 |
| `POST /api/auth/sign-in/social` (google) | `302`→`accounts.google.com` with `state` + PKCE `code_challenge` |
| magic-link request → verify | link logged by stub sender, redeems to a real session |
| user B `GET /api/save` | `404` on **its own** key — never user A's blob |

## Layout

- `src/index.ts` — routes. Auth resolution is the first statement in
  `/api/save`; nothing is parsed or read before identity is known.
- `src/auth.ts` — better-auth instance, built **inside** the request scope
  (Cloudflare bindings only exist per-request) and memoized per isolate.
- `src/env.ts` — binding + secret types.
- `migrations/0001_better_auth.sql` — generated schema (user/session/account/verification).
- `schema-gen.config.ts` — Node-only throwaway config for
  `@better-auth/cli generate`. The CLI cannot load `src/auth.ts` (that needs a
  live D1 binding), so this mirrors its plugin/provider set. **Keep the two in
  sync** or the generated schema will drift.

## Key finding

better-auth ≥1.6 accepts a raw `D1Database` binding directly in its `database`
option union — no Kysely dialect, no `better-auth-cloudflare` community
package. See `@better-auth/core/dist/types/init-options.d.mts`.

## Not proven here

Cookie behaviour in the **third-party** case. On `http://localhost` better-auth
emits `SameSite=Lax` without `Secure`; that says nothing about a GitHub Pages
site calling a `*.workers.dev` Worker. See the T-045 report's cookie matrix.
