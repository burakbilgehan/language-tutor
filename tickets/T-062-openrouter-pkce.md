---
id: T-062
title: OpenRouter PKCE one-click connect ("Connect with OpenRouter")
status: done
priority: p3
effort: M
confidence: medium
depends: [T-060]
created: 2026-07-27
---
DECISION-GATE: Burak isn't sure yet ("an API key is already simple") - can be pulled in after T-060 settles if wanted; a deliberate call to not bloat the redesign wave.

## Research summary (2026-07-27, field-research session)
- The subscription-OAuth path is CLOSED: Anthropic's legal page explicitly forbids third parties from offering Claude.ai login or routing requests under a user's subscription identity (Jan 2026 server block plus Apr 2026 enforcement); Google is the same (Gemini CLI OAuth violated by a third party, the individual tier was shut down in Jun 2026). OpenAI is gray-tolerated (Codex OAuth, the official program isn't GA yet) - watch this space.
- OpenRouter PKCE, however, is OFFICIAL and live: `openrouter.ai/auth?callback_url=...&code_challenge=...(S256)` -> approval -> `POST /api/v1/auth/keys` returns a real API key belonging to the user. Works from the browser (no client secret, CORS open) -> in static mode the key stays in localStorage, WE never hold it in escrow. The user can revoke it from openrouter.ai/keys.
- `:free` models: 20 requests/min; 50 requests/day (permanently 1000/day if the account has ever received $10+ in credit).

## Answer to Burak's question (stays embedded in the ticket)
"This key can call Claude, it can call a Chinese model too - how does the user configure that?" -> They don't. The model is chosen per-request by OUR app via the `model` parameter; the key only carries payment. The quality profile (T-060) fills a concrete slug trio for OpenRouter too (Eco -> :free/deepseek, Balanced -> sonnet class, Best -> opus/frontier); the T-061 live catalog is available in advanced mode. So the UX is identical to other providers - PKCE just turns the "copy-paste a key" step into a "Connect with OpenRouter" button.

## Scope
- A "Connect with OpenRouter" button on the API-key door when OpenRouter is selected (PKCE S256; callback = site origin; must work in both static and server modes).
- Remaining-credit display once connected: `GET /api/v1/key` -> `limit_remaining` (can feed the T-063 status card).
- Key storage via the existing config path (localStorage / llm-config.json) - do NOT invent a new storage layer.
