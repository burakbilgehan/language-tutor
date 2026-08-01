---
id: T-039
title: Bridge CSRF quota-burn + DNS-rebinding output exfil (llm-bridge.mjs)
status: done
priority: p1
effort: S
confidence: high
depends: []
created: 2026-07-22
---
T-026 wave 5 finding. **Threat frame A (real today)**; a remote web
attacker against the user running the bridge, no local foothold needed.
The finding passed fable-verifier + three POST variants were fired
empirically (all reached the CLI spawn). **Verdict: CONFIRMED.**

Root cause: `scripts/llm-bridge.mjs`'s POST handler (lines 233-277) never
gates execution on Origin. `corsHeaders` (207-218) only uses `allowed`
(209) to condition the response ACAO header (212); `runCli` (247) runs
unconditionally on every request. Content-Type isn't checked either
(`JSON.parse` on any body, 239).

Two separate attacks:
- **CSRF quota-burn (no rebinding needed):** the victim, with the bridge
  open, visits a malicious page. The page fires a CORS "simple request"
  POST (`Content-Type: text/plain`, JSON string body) -> no preflight ->
  the browser sends the request -> the CLI runs -> the owner's Max quota
  burns. Blind attack (evil.com can't read the response since it doesn't
  get ACAO), but the side effect still happens.
- **Output exfiltration (via DNS rebinding):** an attacker rebinds
  `attacker.com` to 127.0.0.1 with a short-TTL DNS entry; the page fetches
  `attacker.com:8484` -> the request becomes same-origin -> the browser
  doesn't apply the ACAO read check -> the LLM output is read. Works on
  browsers without PNA (Firefox/Safari); Chromium's PNA preflight likely
  blocks it (the bridge doesn't send ACAO for `attacker.com`). Port 8484
  is guessable. Binding to `127.0.0.1` doesn't stop rebinding (the name
  resolves to loopback on the victim's own machine).
- **PNA header** (216): `access-control-allow-private-network: true` is
  sent UNCONDITIONALLY (unlike 212's `allowed` guard). Inert on its own,
  but disables Chromium's one defense that would have blocked B1/B2, for
  every origin; mitigation-defeating.

The findings' initial verbal mechanism (`!origin` branch / "same-origin
POST doesn't send Origin") was WRONG; per the Fetch spec, POST always
carries an Origin. The risk conclusion still holds, because the handler
never looks at Origin at all.

Suggested fix (small): (1) Host-header allowlist; reject if the `Host`
header isn't `localhost`/`127.0.0.1[:port]` -> kills rebinding. (2) Gate
`runCli` on `allowed` OR require a bearer token generated at startup
(baked into the preset) -> kills simple-request CSRF. (3) Gate the PNA
header on `allowed`. (4) Restrict Content-Type to `application/json`
(closes the simple-request path). The bearer token (2) alone closes both
CSRF and exfil (an attacker page can't read the token).
