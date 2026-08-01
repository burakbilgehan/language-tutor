---
id: T-026
title: Full security review (before going public/monetizing)
status: done
priority: p1
effort: L
confidence: medium
depends: [T-032, T-034, T-035, T-036, T-037]
created: 2026-07-22
---
At some point the project should be able to go public and be monetized
(Burak, 2026-07-22). A full end-to-end security sweep before that threshold.
Should run AFTER the other tickets in this batch finish so the sweep sees the
final state, hence the depends.

Method: `/security-review` + run findings through fable-verifier (adversarial
verification, we don't want plausible-but-wrong findings). Findings ranked by
severity; every finding needs a concrete attack scenario.

Known hot spots already (the sweep shouldn't be limited to these):
- **Save import**: raw SQLite file from the user. There's a version check, no
  content validation. Malicious schema/trigger/huge size/zip-bomb-like
  images; better-sqlite3 + sql.js are two separate parser surfaces.
- **No auth on API routes**: single-user local assumption. If server mode is
  exposed to the internet, every endpoint (including save export!) is open to
  anyone. A public deploy scenario needs at least one auth layer design.
- **LLM config**: `data/llm-config.json` (server, plain file) + localStorage
  (static) API key storage; GET masking; chance of the key leaking into
  logs/error messages/feedback screenshots.
- **Bridge** (`scripts/llm-bridge.mjs`): CORS `--origin`, identity of pages
  connecting to localhost, DNS rebinding, the surface where the bridge
  proxies the Max sub (the reverse of the LLM_CLI_DISABLED logic).
- **XSS**: how LLM-generated content enters the UI, JpMarkdown/Furigana/ruby
  renders, any dangerouslySetInnerHTML, bracket-notation parsers. Put a
  malicious payload in a fixture and try it.
- **Feedback mechanism** (T-017): html2canvas screenshot + GitHub issue
  prefill, does key/personal data on screen end up in the screenshot?
- **Drive sync (post T-032)**: where the OAuth token is kept, scope breadth,
  making sure the save image doesn't leak to third-party origins.
- **Dependencies**: `npm audit` + supply-chain status of critical packages
  (better-sqlite3, sql.js, wanakana, html2canvas-pro).
- **Static deploy**: build-time guarantee that nothing leaks (e.g. data/,
  .env, llm-config) into the `out/` that goes to Pages.

Output: severity-ranked finding list + a fix ticket or an "accepted risk"
record for each. Big items like an auth layer get split into their own
ticket.

---
## Outcome (2026-07-22, done)

6 parallel read-only discovery agents + 2 empirical tests by the orchestrator
+ fable-verifier adversarial verification for every actionable finding.
Details: INDEX "Wave 5 result". Actionable findings -> **T-039..T-042**.

### Accepted risks (no ticket opened)

- **Job route IDOR (frame B):** `generation_jobs` has no `profileId`;
  cancel/cancel-all/resume-pending are unscoped by profile
  (`core/jobs.ts:78,128-220`). NOT EXPLOITABLE in shipped builds, the static
  build carries no routes at all, server mode is single-user localhost.
  Deliberate architectural decision (`core/jobs.ts:78` "jobs aren't
  profile-owned"). Needs tenanting if server mode ever pivots to multi-user,
  left in T-040's scope. No separate fix ticket opened.
- **Feedback screenshot key warning is scoped only to /settings**
  (`FeedbackButton.tsx:364`): safe today, key inputs are `type="password"`
  (html2canvas renders dots), GET only ships the masked key, the wizard/
  provider section only renders on /settings. Defense-in-depth; if a key
  field is ever added to another route, the warning won't silently fire
  there. No concrete leak today -> accepted risk, tiny note.
- **npm audit high/moderate (8):** `drizzle-orm` SQLi (unescaped identifiers)
  UNREACHABLE, the code never uses `sql.identifier`/`sql.raw`; the only
  dynamic piece is `${pid}` in `overview.ts` (parameterized binding, integer
  profile id, not a user-controlled identifier). `esbuild` dev-server CVE
  unreachable (Turbopack is used, esbuild is only a transitive TS-compile
  dependency, `esbuild serve` never runs). `sharp`/`postcss`/`drizzle-kit` are
  build/dev-only, not present on the shipped static surface. All accepted
  risk; `npm audit fix` can be applied opportunistically (without major
  bumps), not a security blocker.

### No finding (verified clean)

- **Static deploy leak:** no `.db`/`.env`/`llm-config`/API key/Google secret
  in `out/` (bundle grep + import-graph check); Pages builds from a clean
  checkout, so only git-tracked files ship. **No owner-sub wiring** (the
  highest-risk check): the server provider is only imported into `jobs.ts`
  via the stashed `/api/*`, `core/*` uses DI, the static client only calls the
  user's own key/bridge (`browser-provider.ts`).
- **LLM output -> UI XSS:** every LLM field is either React-escaped or goes
  through react-markdown (no rehype-raw/allowDangerousHtml). Empirical
  payload test: `<img onerror>`, `<script>`, `javascript:` link, all
  entity-escaped/inert. One thing to watch: stored-XSS would open up if
  `rehype-raw` is ever added to JpMarkdown.
- **Drive OAuth (T-032):** token is memory-only (~1h, no refresh token),
  `drive.appdata` scope, client-id/secret not embedded (user supplies it),
  the save image only goes to googleapis.com, popup/postMessage flow
  (no redirect/token-in-URL).
</content>
