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
- Lessons are generated on first open, then cached — and **prefetched**: completing a node fires a background lesson job for the just-unlocked successor (`ensureLessonJob` in jobs.ts), so the next open is usually instant. Side quests generate fresh **per completed run** (fast tier): the payload is cached on `nodes.side_quest_payload` at start and cleared on completion, so re-opens/refreshes don't re-call the LLM. Grammar topics generate on demand ("Hazırla").
- LLM frugality: `createJob` dedupes on (jobType, refId) — an in-flight job's id is returned instead of enqueuing a duplicate, so the same resource is never generated twice. Grading: mcq/fill_blank are deterministic; translate/free_response hit the LLM only when the romaji-tolerant compare misses, and an identical resubmitted answer reuses the prior LLM verdict from `attempts`. Lesson generation receives a "struggles" line (high-lapse SRS cards + low-score attempt topics, `src/lib/struggles.ts`). Per-purpose call counts: `/api/stats` `byPurpose` + settings.
- Exercise grading: deterministic compare first (answer + accept_also), LLM fallback for translate/free_response. Comparison is romaji-tolerant via `src/lib/jp.ts` (wanakana): user types romaji, answers may be kana/kanji; particle (は/wa) and long-vowel spellings folded.
- Japanese text conventions: LLM emits furigana as bracket notation `漢字[かんじ]`, rendered by `Furigana` (ruby). `SelectionTooltip` (global, in layout) shows romaji for selected JP text. Kanji is introduced early by prompt design.
- Grammar is a **deterministic cheatsheet**: language-wide topic index is static code (`src/lib/grammar-index/`, ~300 JA entries N5→N1 level-major), seeded at curriculum creation (and self-healing in `/api/grammar`); topic content LLM-generated once, cached. Don't move the index back into the curriculum prompt. `ensureSeeded` is an **incremental diff-seed** (adds missing slugs, re-syncs position/title/category/level, never touches content/status) — so index growth reaches existing profiles; keep it incremental, not early-return.
- Curriculum is **extendable across JLPT levels** (N5→N1): one `curricula` row per profile, each level = a `curriculum_chapters` row + a contiguous block of `units` (`units.chapterId`/`level`). `runChapterJob(profileId, level)` in `jobs.ts` generates one level and appends it to the flat `nodes.prereqNodeId` chain (new head's prereq = old chain tail, found by walking the chain, not position-sort). Auto-extend fires from `/api/nodes/[id]/complete` when the tail is cleared; manual via `POST /api/curriculum/extend`. Side quests are created once (N5 only). `src/lib/curriculum/levels.ts` is the single JLPT-order source. Legacy pre-chapters curricula are backfilled to one N4 chapter lazily (`ensureChaptersBackfilled`).
- Save export/import (`src/lib/save/`, `/api/save/{export,import}`, Settings UI): raw SQLite snapshot via `db.$client.serialize()` + WAL checkpoint, stamped with `save_meta` (schema version). Import is **replace-all** (wipes local, keeps one `.bak`), refuses on version mismatch. `db` in `src/db/index.ts` is a **lazy Proxy** + `resetDb()` so import can swap the file under the live connection. **Bump `SAVE_SCHEMA_VERSION` (`src/lib/save/version.ts`) whenever `schema.ts` changes shape.**
- LLM cost tracking: every real CLI call records `total_cost_usd` + tokens into `llm_calls`; `/api/stats` aggregates; header badge + settings show it. Informational only (Max sub isn't billed per-token).
- Dutch: create a new profile with `targetLanguage: 'nl'` — schema is multi-language, no code changes expected.

## Style
Cozy warm palette (cream/terracotta/moss, tokens in `globals.css` `@theme`), Fraunces + Nunito Sans, Turkish UI copy. No purple gradients, no dashboard aesthetic.
