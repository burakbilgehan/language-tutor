# language-tutor

Personal gamified language tutor (Japanese first, Dutch later). Turkish UI.
Deterministic Next.js app; the LLM is only the content engine.

## Stack
Next.js 15 (App Router, `src/`) + TS + Tailwind 4 + SQLite (Drizzle + better-sqlite3, WAL, `data/app.db`).

## LLM engine — IMPORTANT
- Uses the **Max subscription via the local `claude` CLI** (`claude -p --output-format json --json-schema ...`), NOT an API key. `src/lib/llm/claude-cli.ts` strips `ANTHROPIC_API_KEY` from the child env on purpose — an API key would shadow subscription auth and bill per-token. Never add `--bare`.
- Provider seam: `src/lib/llm/provider.ts`. `LLM_PROVIDER=fixture` = canned JSON from `src/lib/llm/fixtures/` (default dev loop, zero tokens). Tier→model env: `LLM_MODEL_FAST|BALANCED|DEEP` (defaults haiku/sonnet/opus).
- All LLM outputs are zod-validated (`src/lib/llm/schemas.ts` = single source of truth for prompts, DB json columns, UI types). CLI calls are serialized (concurrency 1) because Max limits are shared with interactive Claude Code sessions.

## Commands
- `LLM_PROVIDER=fixture npm run dev` — token-free dev
- `npm run dev` — real LLM
- `npm run llm:smoke` — provider canary (one haiku call); fixture mode validates fixtures
- `npm run db:push` / `db:studio`, `npm test` (SM-2 unit tests)

## Architecture notes
- Long generations (curriculum ~2-5 min) run as fire-and-forget jobs (`src/lib/jobs.ts`, `generation_jobs` table) polled via `/api/jobs/[id]`; stale-running jobs recovered on boot. Parse failures persist raw output to `generation_jobs.raw_output`.
- Lessons are generated on first open, then cached. Side quests generate fresh each run (fast tier). Grammar topics generate on demand ("Hazırla").
- Exercise grading: deterministic normalize-compare first (answer + accept_also), LLM fallback for translate/free_response.
- Grammar content is structured JSON tables (never markdown blobs) rendered by `GrammarTable`.
- Dutch: create a new profile with `targetLanguage: 'nl'` — schema is multi-language, no code changes expected.

## Style
Cozy warm palette (cream/terracotta/moss, tokens in `globals.css` `@theme`), Fraunces + Nunito Sans, Turkish UI copy. No purple gradients, no dashboard aesthetic.
