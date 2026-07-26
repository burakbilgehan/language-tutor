# Okumo — gamified language tutor

**Live: https://okumo.dev**

Personal language tutor for **Japanese, Chinese and Dutch** (any other language
falls back to a CEFR curriculum). A deterministic Next.js app where an LLM is
only the content engine — lessons, grammar explanations and grading come from a
model, everything else (curriculum structure, SRS, progress, dictionaries) is
plain code and data. UI in Turkish and English.

## Using the site

- **Anonymous and local-first by default.** All your data — profiles, progress,
  SRS deck, generated lessons — lives in your browser (a SQLite image via
  sql.js, persisted to IndexedDB). Nothing is uploaded anywhere.
- **Save file.** Settings → save export/import. One `.db` file; import is
  replace-all (a local `.bak` of the previous state is kept).
- **Google sign-in (optional).** Signed-in users can push their save to the
  cloud ("Buluta gönder") and pull it on another device. Sync is manual,
  last-write-wins, one save slot per account (`saves/{userId}/latest.db` on R2;
  uploads are seed-stripped from ~17 MB to ~8 MB and reconstituted from
  packaged content on restore). Sign-in is currently in Google's *testing*
  mode, so only allowlisted accounts can log in.
- **LLM setup.** The packaged libraries (grammar cheatsheets, kanji, HSK vocab)
  work with **zero LLM**. Generating new lessons, curricula or chat needs a
  model you bring: an API key (Anthropic or any OpenAI-compatible endpoint,
  e.g. DeepSeek/OpenRouter), a local Ollama, or the bundled CLI bridge
  (`npm run llm:bridge`) that reuses a coding-CLI subscription (Claude, Codex,
  Copilot, Gemini). The in-app wizard (Settings → LLM) walks through all three.
  Your key/config stays in your browser's localStorage.
- **Data sources & licenses** for the packaged content are listed on the
  in-app attribution page.

## Development

```sh
npm install
LLM_PROVIDER=fixture npm run dev   # token-free dev loop (canned LLM fixtures)
npm run dev                        # real LLM via the local `claude` CLI
npm test                           # unit tests
npm run build:static               # static export to out/ (what production serves)
```

Backend (Cloudflare Worker) lives in `worker/` with its own package:

```sh
cd worker && npm install
npm run dev        # local Worker on :8787 with local D1/R2 (no account needed)
npm test           # test suite on real workerd, includes the auth gate
```

## Architecture (short)

- **Hosting:** the Next.js static export is served as Cloudflare Worker static
  assets on the same origin as the API (`/api/*` is routed to the Worker
  first) — so the session cookie is first-party, `SameSite=Lax`.
- **Auth:** [better-auth] on the Worker, Google OAuth only, sessions in D1.
  Every mutating API route resolves the session before anything else runs,
  enforced by the route-table types and a test gate.
- **Cloud saves:** R2, tenant-scoped by the server-derived user id — the key
  never comes from client input.
- **Server mode** (`npm run dev` at the root) is the same app against
  on-disk SQLite; shared logic lives in the env-agnostic `src/core/*` seam.
- Deep docs: `CLAUDE.md` (app conventions), `worker/README.md` (backend +
  deploy runbook), `tickets/` (work log).

[better-auth]: https://better-auth.com

## Status

Personal project. No license granted yet — external contributions aren't
accepted for now. Feedback is welcome through the in-app feedback button
(prefills a GitHub issue).
