# okumo-bridge

Local HTTP bridge for [Okumo](https://okumo.dev) — exposes a terminal LLM
CLI you're already subscribed to (`claude`, `codex`, `copilot`, `gemini`,
or `opencode`) as an OpenAI-compatible endpoint on `localhost`. Nothing
leaves your machine; the bridge only talks to the CLI process and to Okumo
running in your browser.

## Usage

The bridge only allows requests whose browser `Origin` is `localhost`/
`127.0.0.1` unless you add more with `--origin`. **Okumo itself
(`https://okumo.dev`) is not in the default allowlist** — a bare
`npx okumo-bridge` will reject the app's live "is the bridge running?"
probe with `403 origin_not_allowed`. If you're using the hosted app, pass
its origin explicitly:

```
npx okumo-bridge --origin https://okumo.dev
```

Other flags:

```
npx okumo-bridge --backend codex
npx okumo-bridge --backend claude --port 9000
npx okumo-bridge --origin https://your-static-deploy.example
npx okumo-bridge --token some-secret   # require a bearer token (gates /health too)
```

Pin the version so a future release can't silently change behavior under
you:

```
npx okumo-bridge@0.1.0 --origin https://okumo.dev
```

Then in Okumo: Settings → LLM Provider → "API / Local server" → Base URL
`http://localhost:8484/v1`.

Supported backends: `claude`, `codex`, `copilot`, `gemini`, `opencode`.
Only `claude`, `codex`, `copilot`, `gemini` are exposed in the app's setup
wizard today; `opencode` works identically but is reached via this CLI
flag rather than the guided UI (see ticket T-059 / T-060 for the reasoning
— roughly, the wizard covers the four assistants most Okumo users already
have installed).

## Endpoints

- `GET /health` → `{ ok, backend, cliFound }`. `cliFound` is a cheap PATH
  lookup (`which`/`where`) for the backend's CLI binary — it does NOT
  confirm the CLI is logged in or that a call would succeed, only that the
  binary is installed.
- `GET /v1/models`, `POST /v1/chat/completions` → OpenAI-compatible surface
  consumed by Okumo's HTTP provider.

All three endpoints sit behind the same gate (see Security below): Host
allowlist, then Origin allowlist, then optional bearer token. `/health`
gets no special treatment — if you've set `--token`, an unauthenticated
probe (including Okumo's own "is the bridge running" check) will also get
a 401 from `/health` until it sends the token.

## Security

This bridge starts a plain HTTP server on `127.0.0.1`. Threat model and
mitigations (CSRF quota-burn + DNS-rebinding output exfiltration) are
documented at the top of the source file and in ticket T-039. Summary:

- Binds only to `127.0.0.1`.
- `Host` header must be `localhost`/`127.0.0.1[:port]` — stops DNS
  rebinding.
- CLI execution is gated on the request's `Origin`, not just the CORS
  response header — an unlisted origin never reaches the CLI, so a
  malicious page visited while the bridge is running can't burn your
  subscription quota.
- `Content-Type` must be `application/json` — closes the CORS
  "simple request" (no-preflight) path.
- The Private Network Access response header is only sent to allowed
  origins.
- `--token` adds an optional bearer-token requirement on top of all of the
  above.

`--origin` accepts the site you're using — `https://okumo.dev`, a fork's
deploy, or a static build served from somewhere else. Only
`localhost`/`127.0.0.1` are allowed by default; every other origin,
`okumo.dev` included, must be added explicitly (see Usage above).

## Source of truth

The published bin file (`bin/okumo-bridge.mjs`) is a verbatim copy of the
canonical script at `scripts/llm-bridge.mjs` in the
[language-tutor](https://github.com/burakbilgehan/language-tutor) repo.
Edit the canonical file, then run `node sync-source.mjs` from this
directory (or just `npm pack` — it runs automatically via `prepack`) to
refresh the copy before publishing. The bin file must stay a single
file with no local imports (only `node:` builtins) so it also works when
served standalone as a same-origin download
(`https://okumo.dev/llm-bridge.mjs`, the non-npm fallback for people who
can't or don't want to hit the npm registry).

## Release checklist (maintainer / ops — not automated by this repo)

1. Edit `scripts/llm-bridge.mjs` at the repo root as normal.
2. From `packages/okumo-bridge/`, bump `version` in `package.json`
   (semver; this is what `npx okumo-bridge@x.y.z` pins against).
3. `node sync-source.mjs` to refresh `bin/okumo-bridge.mjs` (or skip —
   `npm pack`/`npm publish` do this automatically via `prepack`).
4. `npm pack` and inspect the tarball (`tar -tzf okumo-bridge-*.tgz`) —
   confirm it contains only `package.json`, `README.md`, and
   `bin/okumo-bridge.mjs`.
5. `npm publish` from an account with rights to the `okumo-bridge` name
   on the npm registry (not automated here — nobody in this repo's CI has
   publish credentials, and this ticket does not create any).
6. Update any pinned `npx okumo-bridge@x.y.z` references in the app's
   setup UI to the new version (owned by a different ticket, not this
   package).

`npm view okumo-bridge` should be checked before the first publish to
confirm the name is actually available on the registry.
