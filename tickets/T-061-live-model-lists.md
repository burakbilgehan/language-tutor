---
id: T-061
title: Live model lists: Ollama tags / OpenRouter models / bridge
status: done
priority: p3
effort: S
confidence: high
depends: [T-057, T-060]
created: 2026-07-27
---
Feed the free-text model boxes in the advanced panel (T-060) with live data; do cheap validation before "test" burns a real LLM call.

- **Ollama**: `GET :11434/api/tags` -> the models the user has ACTUALLY pulled show up in the dropdown; if the catalog's suggestion isn't pulled, warn "run `ollama pull X` first" (today: hardcoded llama3.2/3.1, cryptic failure on test if it isn't pulled).
- **OpenRouter**: `GET /api/v1/models` (no key needed, public) -> search plus price plus a `:free` filter; full catalog in advanced, T-057 profiles in the casual flow.
- **Bridge**: `GET :8484/v1/models` (existing) -> shows the active backend.
- OpenAI/DeepSeek/Anthropic: NO live list (their endpoints are noisy/require a key) - T-057's curated list is enough.
- Before testing: if the selected model isn't in the list (for providers where listing is possible), show a meaningful error instead of burning a real call.

Fence: T-060's advanced panel component + small fetch helpers.
