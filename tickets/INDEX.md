# Backlog

Ticket files live in this directory; each carries frontmatter (status/priority/effort/
confidence/depends) plus context. Statuses: backlog -> todo -> in-progress
-> done / wontfix. Work is pulled from here when the queue is empty; new work = new T-xxx
file + a row here. This index is updated with every ticket change.

| ID | Title | Status | Priority | Effort | Confidence |
|---|---|---|---|---|---|
| [T-078](T-078-mcq-option-shuffle.md) | MCQ option shuffle in the code layer (answer is always option A) | done | p1 | S | high |
| [T-079](T-079-metaprompt-curriculum.md) | Meta-prompt curriculum architecture: language-pair-specific prompts (deep tier) | done | p1 | L | medium |
| [T-080](T-080-curriculum-prompt-transparency.md) | Curriculum prompt transparency: show + edit pedagogy, contract locked | done | p1 | M | medium |
| [T-081](T-081-web-speech-tts.md) | TTS via Web Speech API: speaker buttons on vocab and examples | done | p2 | M | high |
| [T-082](T-082-curriculum-delete-regenerate.md) | Curriculum delete + regenerate with starting level; per-lesson delete | todo | p1 | M | medium |
| [T-083](T-083-granular-placement.md) | Granular placement: start mid-level (parked, needs design ruling) | backlog | p3 | L | low |
| [T-084](T-084-lesson-template-customization.md) | Lesson prompt template customization (phase 2 of transparency) | backlog | p3 | M | low |
| [T-085](T-085-google-tts-byo-key.md) | Google Cloud TTS as optional BYO-key quality upgrade | backlog | p3 | M | medium |
| [T-077](T-077-french-conjugator.md) | French conjugator view for /conjugate (fr is nav-gated until it exists) | backlog | p2 | M | medium |
| [T-073](T-073-cancel-must-stick.md) | Cancel must stick: a cancelled lesson should not auto-regenerate | todo | p1 | S | high |
| [T-075](T-075-coverage-ledger.md) | Coverage ledger: deterministic summary instead of the raw question list in the lesson prompt | todo | p1 | M | medium |
| [T-076](T-076-furigana-raw-surfaces.md) | promptTr doesn't pass through furigana rendering: raw brackets showing + surface audit | todo | p2 | S | high |
| [T-074](T-074-bridge-log-ids.md) | Bridge logs should stamp the job id on every line | todo | p3 | XS | high |
| [T-072](T-072-bridge-job-reattach.md) | Bridge job id + result cache: refresh must not kill generation, finished jobs must not vanish | done | p2 | M | medium |
| [T-071](T-071-lesson-skeleton-lazy-load.md) | Split lesson generation: fast skeleton + exercises completed in the background | todo | p1 | L | medium |
| [T-069](T-069-kill-server-static-duality.md) | Remove the server/static duality: converge to static as the single runtime | todo | p1 | XL | medium |
| [T-070](T-070-lesson-gen-failure-ux.md) | Lesson generation failure black hole: bridge timeout + swallowed error + cancel/retry | done | p1 | M | high |
| [T-068](T-068-lesson-window-prefetch.md) | Lesson prefetch window: the "if active is n, keep through n+2 ready" invariant (both modes) | done | p1 | M | high |
| [T-056](T-056-llmless-first-content.md) | No-LLM flow: Phase 1 bug fix + Phase 2 library hub + anonymous door (ruling B) | done | p1 | M | high |
| [T-064](T-064-en-native-seed-gap.md) | Content fallback chain: LLM -> seed -> auto-translate (badged) -> honest gap; grammar phase done, badge copy + full run pending Burak's decision | done | p1 | L | medium |
| [T-057](T-057-model-catalog.md) | Single-source model catalog: Eco/Balanced/Best + stale-id cleanup | done | p2 | M | high |
| [T-058](T-058-catalog-freshness.md) | Catalog freshness mechanism (Worker validation + staleWarnings) | done | p3 | M | medium |
| [T-059](T-059-bridge-npx-health.md) | Bridge blackbox: npx package + /health + opencode decision | done | p2 | M | high |
| [T-060](T-060-wizard-ia-redesign.md) | Wizard IA redesign: 3 doors, live detection, quality profile, honest copy | done | p2 | L | medium |
| [T-061](T-061-live-model-lists.md) | Live model lists (Ollama tags / OpenRouter / bridge) | done | p3 | S | high |
| [T-062](T-062-openrouter-pkce.md) | OpenRouter PKCE one-click connect (resolved per the 2026-07-28 gate ruling) | done | p3 | M | medium |
| [T-063](T-063-connection-status-card.md) | Connection status card + bridge-down error routing | done | p3 | S | high |
| [T-066](T-066-llm-config-save-contract.md) | LLM config save-path contract (key transport + concurrency + test-before-save); T-060 review finding | done | p2 | S | high |
| [T-024](T-024-save-job-queue-leak.md) | Job queue leak into save (import burns tokens); temporary fix, permanent fix is T-034 | done | p1 | S | high |
| [T-025](T-025-onboarding-load-or-new.md) | Onboarding "Load save / Start new" screen | done | p2 | M | high |
| [T-026](T-026-security-review.md) | Comprehensive security review (runs after the batch) | done | p1 | L | medium |
| [T-039](T-039-bridge-csrf-rebinding.md) | Bridge CSRF quota-burn + DNS-rebinding exfil (frame A, CONFIRMED) | done | p1 | S | high |
| [T-040](T-040-server-mode-auth-gate.md) | Server mode env-token auth gate (frame B, public blocker) | done | p1 | M | high |
| [T-041](T-041-save-import-hardening.md) | Save import hardening (malicious trigger + static size cap) | done | p2 | M | high |
| [T-042](T-042-scrub-rawoutput-export.md) | Scrub raw_output from save export (LLM key leak path) | done | p3 | S | high |
| [T-043](T-043-multi-tenant-isolation.md) | Server-mode (self-host) multi-tenant isolation; cloud tenancy moved to T-046/47 | backlog | p3 | XL | low |
| [T-051](T-051-rebrand-okumo.md) | Rebranding: name okumo + brand copy/tone (visuals -> T-052/53) | done | p2 | M | medium |
| [T-052](T-052-yuyake-palette.md) | Yuyake palette migration (v2 handoff): globals drop-in + moss/gold -> indigo/amber + info variant + Kumo mark | done | p2 | S | high |
| [T-053](T-053-yuyake-usage-screens.md) | Yuyake usage rules: applied to 5 screens (vermilion=action, indigo=info/state, amber=reward) | done | p2 | M | medium |
| [T-065](T-065-yuyake-out-of-scope-leftovers.md) | Yuyake leftovers: focus/selected/token cleanup on out-of-scope screens (from the T-053 report) | done | p3 | S | high |
| [T-055](T-055-sky-polish-leftovers.md) | Sky leftovers (tied to the implementation that was reverted) | wontfix | p3 | S | high |
| [T-054](T-054-okumo-landing.md) | okumo.dev landing page: at `/` root, flag + pre-paint gate + AppChrome | done | p3 | M | low |
| [T-045](T-045-backend-spike-skeleton.md) | Backend spike + skeleton (CF Worker+R2+D1+auth end to end); stack VALIDATED | done | p1 | M | medium |
| [T-046](T-046-auth-better-auth.md) | Auth: better-auth on Worker (Google-only, same-origin, test-gated) | done | p1 | L | medium |
| [T-047](T-047-cloud-save-sync.md) | Cloud save-sync (R2 blob + seed-strip + client seam, manual push/pull) | done | p1 | L | medium |
| [T-048](T-048-login-entry-ui.md) | Sign-in UI (anonymous/load + login + fetch from cloud) | done | p2 | M | high |
| [T-049](T-049-login-cloud-ux.md) | Login/cloud UX fixes (return leg + import->push + signed-in intro) | done | p1 | M | high |
| [T-050](T-050-remove-drive-backup.md) | Remove Google Drive backup (superseded by cloud-sync) | done | p1 | M | high |
| [T-044](T-044-mcq-bracket-grading.md) | mcq marks the correct option as "wrong" (bracket-strip asymmetry) | done | p1 | S | high |
| [T-067](T-067-lesson-drawer-residual-jank.md) | Residual scroll jank in the lesson drawer: raster cost (suspect rounded clip / shadow) | backlog | p2 | S | medium |
| [T-027](T-027-routing-hardening.md) | Routing hardening (language switch + .txt navigation) | done | p1 | M | medium |
| [T-028](T-028-settings-affordance.md) | Settings chip: tucked in the corner but visible | done | p3 | S | high |
| [T-029](T-029-vocab-index-multiform.md) | Vocab index multi-form merge (马 "horse") | done | p2 | S | high |
| [T-030](T-030-ja-vocab-dictionary.md) | ja word dictionary (JMdict-based) | reverted | p2 | L | medium |
| [T-031](T-031-content-language-isolation.md) | Content language isolation (Turkish leaking into en) | done | p2 | M | medium |
| [T-032](T-032-save-ux-drive-sync.md) | Save nudge + Google Drive backup | done | p2 | L | medium |
| [T-033](T-033-vocab-search-ranking.md) | Dictionary search ranking ("ma" noise) | done | p1 | S | high |
| [T-034](T-034-job-queue-control-panel.md) | Job queue control panel (visibility + cancel + boot confirmation) | done | p1 | L | medium |
| [T-035](T-035-srs-chat-language-stamp.md) | SRS back side + chat language stamp (T-031 leftover) | done | p2 | S | medium |
| [T-036](T-036-attribution-page.md) | Attribution/license page (JMdict/Tanos/HSK...) | done | p2 | S | high |
| [T-037](T-037-vocab-index-eager-bundle.md) | Vocab index eager bundle (~1.8 MB per profile) | done | p2 | M | high |
| [T-016](T-016-reading-aware-search.md) | Reading-aware search (hikari -> 光) | done | p2 | M | medium |
| [T-017](T-017-feedback-mechanism.md) | User feedback mechanism (+screenshot) | done | p2 | M | medium |
| [T-015](T-015-mobile-friendly.md) | Mobile-friendly transition | done | p2 | L | medium |
| [T-001](T-001-inburgering-mock-exams.md) | Inburgering mock exam sections | backlog | p2 | M | medium |
| [T-005](T-005-zh-stroke-dictionary.md) | zh stroke order + hanzi dictionary (CEDICT) | backlog | p2 | L | medium |
| [T-004](T-004-overview-llm-layer.md) | Overview LLM commentary layer | backlog | p3 | S | medium |
| [T-002](T-002-skill-tree.md) | Skill tree (branching lesson graph) | backlog | p3 | XL | low |
| [T-023](T-023-haiku-content-qa.md) | Content quality audit: all languages/surfaces, read-only report; session prompt in the ticket | todo | p1 | S | high |
| [T-019](T-019-vocab-bulk-fill-seed.md) | zh dictionary seed infrastructure (export + applyVocabSeed) | done | p2 | M | high |
| [T-003](T-003-remaining-grammar.md) | Remaining grammar (zh 99 + ja 16); weekend quota | done | p1 | S | high |
| [T-021](T-021-conjugate-zh-nl-content.md) | Conjugation cheatsheet: zh weak, nl empty | done | p2 | M | medium |
| [T-006](T-006-nl-weak-separables.md) | nl weak separable verbs | done | p3 | S | high |
| [T-022](T-022-regenerate-with-feedback.md) | Feedback text box for lesson regeneration | done | p2 | S | high |
| [T-018](T-018-remove-side-quests.md) | Remove the side quest feature | done | p2 | M | high |
| [T-020](T-020-cjk-typography.md) | CJK typography: hanzi small/font inconsistent | done | p2 | S | medium |
| [T-014](T-014-static-nav-basepath.md) | Nav basePath loss in static mode (import/language switch -> /map) | done | p1 | S | high |
| [T-013](T-013-stale-nav-after-profile-add.md) | Header/nav goes stale after adding a new language | done | p3 | S | high |
| [T-012](T-012-zh-vocab-dictionary.md) | zh word dictionary (HSK vocab cheatsheet) | done | p2 | M | high |
| [T-008](T-008-branch-hygiene.md) | Branch push / PR decision (direct push to main + Pages env fix) | done | p2 | S | high |
| [T-009](T-009-local-first-static.md) | Phase 2b: local-first static build (browser SQLite + Pages) | done | p1 | XL | medium |
| [T-010](T-010-llm-setup-wizard.md) | LLM connection wizard (setup flow for non-technical users) | done | p1 | M | high |
| [T-011](T-011-sidequest-backfill.md) | Backfill side quests for existing nl/zh profiles | wontfix | p2 | S | high |
| [T-007](T-007-kanji-n1-tail.md) | Kanji N1 tail (moved to ops: blast panel) | wontfix | p3 | S | high |

The roadmap sections below are historical sprint logs, newest first; they record decisions at the time they were made and may be superseded by later tickets.

## Roadmap (2026-08-05): content quality waves (nl fallout)

Context: the Dutch curriculum exposed CJK-biased prompts (alphabet units,
written "pronunciation" exercises, answer-always-A). Rulings: shuffle in code;
curriculum prompts generated per language pair by the deep tier; transparency
at curriculum creation only; Web Speech TTS; delete/regenerate flows.
The 2026-08-05 prompt hotfix (latinCore etc., uncommitted) is superseded by
T-079 and gets dissolved there.

- Wave C1 — T-078:sonnet T-079:opus — parallel; fences: player/practice UI vs
  llm-prompts+core/curriculum-gen+schema; disjoint. T-079 merges last (schema).
- Wave C2 — T-080:opus T-081:sonnet — parallel after C1; fences: wizard/
  settings/client-api vs tts util+player/vocab surfaces. T-081 must not touch
  client-api; T-080 must not touch LessonPlayer.
- Wave C3 — T-082:opus — solo (destructive data ops both modes; overlaps C2's
  settings surface, hence after).

Not in a wave: T-083/T-084/T-085 (parked backlog, need rulings or field
evidence). Hard order: C1 -> C2 -> C3 (dependency T-079 -> T-080/T-082 plus
fence overlaps).

## Roadmap (2026-07-27): LLM connection UX waves

Context: field research (2026-07-27) closed off the subscription-hosting path
(Anthropic/Google ToS; summary in T-062). Burak's decisions: 3 doors
(No-LLM / local / API key), Ollama+bridge in a single local door, quality profile
Eco/Balanced/Best plus a budget hint, pinpoint models in the advanced panel,
catalog freshness via a Worker mechanism, bridge npx + honest-friction copy.

**Wave L1 (3 parallel, fence-separated; verify before starting, per the 2026-07-18 lesson):**
| Item | Ticket | Model | Effort | Fence |
|---|---|---|---|---|
| L1a | T-056 (Phase 2) | opus | M | **done** (2026-07-27 solo wave, pulled forward) - end of `OnboardingWizard.tsx` + `RoadmapView` + client-api curriculum path |
| L1b | T-057 | opus | M | `src/lib/llm/*` + only the hardcoded lines in settings components (tier-resolution unification touches the provider seam -> regression risk, opus) |
| L1c | T-059 | sonnet | M | `scripts/llm-bridge.mjs` + new package directory; does not touch app code |

Warning: possible overlap between L1a and L1b at `client-api.ts`; L1b must not
touch that file (the catalog stays inside `src/lib/llm/`).

**Wave L2 (solo):**
| Item | Ticket | Model | Effort | Note |
|---|---|---|---|---|
| L2 | T-060 | opus | L | The heart of the wave; wizard+settings+i18n is a broad surface, runs solo. All three of L1 must be merged first |

**Wave L3 (3 parallel):**
| Item | Ticket | Model | Effort | Fence |
|---|---|---|---|---|
| L3a | T-061 | sonnet | S | T-060's advanced panel + fetch helpers |
| L3b | T-063 | sonnet | S | settings card + LessonPlayer/ChatPanel error paths |
| L3c | T-058 | sonnet | M | `worker/` + `catalog.ts` loading layer; warning: verify overlap with L3a's catalog.ts before starting |

**Decision gate (not yet sequenced):** T-062 (OpenRouter PKCE); becomes L4
with Burak's approval, does not start independently of T-060.

---

## Roadmap (2026-07-26 sprint): grouping of the entire open backlog

Wave 5 (security review) is done. Burak's decision (2026-07-26): fix all
security items now, plus a new grouping covering the entire open backlog. Same rules:
one step = one session, push straight to main when done (T-008); parallel steps
in separate worktrees + branches, smaller one merges first. Env note: dev server + blast
dashboard are open, so a second `next build` is FORBIDDEN (tsc/test/parity harness OK);
code changes don't write to the DB, but don't overlap the blast quota window.

### Wave B: backend + identity (2026-07-26), COMPLETE

The chain ran end to end in a single master session on 2026-07-26 (T-045->T-048,
all merged+pushed). Decisions: **no domain -> Google-only** (magic link dropped:
no domain means no email sender) + **hosting to same-origin Cloudflare** (Worker
static assets, GH Pages anonymous mirror). Size reality: strip 17.54->8.55 MB
(the 2-4 MB estimate was wrong; generation_jobs done/error history is 28%, a separate decision).
Remaining ops (Burak): CF account setup + Google OAuth client + deploy
(`worker/README.md`); on deploy, put the site origin into `TRUSTED_ORIGINS`; manual
test checklist is in the T-048 report. The `out/` build must be produced
WITHOUT `NEXT_PUBLIC_BASE_PATH` (don't hand the Pages build to the R2 worker).

Burak's decision: switch from content waves 6-7-8 to the backend. Local-first
is PRESERVED (anonymous = pure local, unchanged); login = sync the save to our
cloud. Locked tech: **Cloudflare R2 (10GB) + better-auth (Google + magic link)**;
scope is **identity + cloud-save** (LLM-hosting/monetization is SEPARATE, later). Static
content (seed+strokes, 39MB) stays on Pages/CDN. Measurement: 71% of a save is
seed-derived content, so seed-strip on upload brings the cloud blob to ~2-4MB.

**Serial chain** (interdependent, T-046/47 share the same Worker codebase):
`T-045:opus -> T-046:opus -> T-047:opus -> T-048:opus`, all opus (backend/
auth/security/new platform). hive-wave serial-chain mode: **a single master fable
session** runs the whole chain; each step is an isolated worktree agent, merge on
completion + gate, start the next if green. `->` = a launch barrier (the next step
waits for the previous one's merge). Not a parallel batch; context stays clean via a
distilled report per step. Kickoff: `/hive-wave T-045:opus -> T-046:opus -> T-047:opus -> T-048:opus`.

| Step | Ticket | Note |
|---|---|---|
| B0 | T-045 | **SPIKE first**: prove better-auth-on-Workers + magic-link sender + cookie/domain; if it fails, the architecture pivots here |
| B1 | T-046 | Auth in prod. **Decision:** custom domain (advisor: cheapest for same-origin cookies, wanted before monetization anyway). Worker gets its own auth-test gate |
| B2 | T-047 | Cloud-sync. Seed-strip on upload + manual push/pull (NOT auto) + tenant-scope |
| B3 | T-048 | Sign-in UI: anonymous/load/**login** three-way door + fetch from cloud |

Open decision (Burak): **will a custom domain be purchased?** (the cookie story
depends on it; T-046). T-043 rescoped: cloud tenancy moved to T-046/47,
remainder = self-host multi-tenancy (deferred).

Waves 6/7/8 below were deferred to AFTER the backend.

---

hive-wave format: each wave is 2 parallel isolated-worktree agents. Model routing:
**opus** = security/architecture/design-heavy (subtle semantics, regression risk);
**sonnet** = mechanical/pattern-following/small additions. Merge order: least-overlapping
first, cross-cutting/shared-global LAST. Every security fix tests ATTACK + LEGITIMATE
path together (regression on the legit path).

**Wave 5.1: security core (2 parallel, fence-separated):**
| Item | Ticket | Model | Effort | Fence (touches) | Note |
|---|---|---|---|---|---|
| 5.1a | T-042 | sonnet | S | `save/export.ts`, `backup/save-image.ts` | raw_output scrub. Mechanical. **Small -> merges first.** |
| 5.1b | T-039 | opus | S | `scripts/llm-bridge.mjs` (+`presets.ts`/`browser-provider.ts` for the token) | Bridge: host allowlist + Content-Type + optional token. **The one finding that's exploitable today.** Legit: browser->bridge preset must keep working. |

Fences separate (save vs bridge, no overlap) -> safe to parallelize.

**Wave 5.2: security import+auth (2 parallel, DEPENDS on 5.1):**
| Item | Ticket | Model | Effort | Fence | Note |
|---|---|---|---|---|---|
| 5.2a | T-041 | opus | M | `save/import.ts`, `backup/save-image.ts`, `db/browser.ts`, `client-api.ts`; **do NOT touch route files** (server already has a 100MB guard) | Reject-strip user-defined triggers/views (not a schema rewrite) + static size cap + server magic-header. Legit: export->import round trip + parity harness. |
| 5.2b | T-040 | opus | M | new `requireAuth` lib + every mutating/exfil `route.ts` wrapper; **do NOT touch `lib/save`** | Env-token gate (`APP_AUTH_TOKEN`). No-op when no token is set (must not break the localhost single-user flow). **Cross-cutting -> merges LAST.** |

Warning: **dependency**: 5.2a touches `save-image.ts`, so does 5.1a -> **5.2
cannot start until 5.1 is merged** (rebase required). With fences respected
(5.2a stays out of routes, 5.2b stays out of lib/save), 5.2a and 5.2b are safe in parallel.

**Wave 6: content (p2), after security (2 parallel):**
| Item | Ticket | Model | Effort | Note |
|---|---|---|---|---|
| 6a | T-005 | opus | L | zh stroke order + hanzi dictionary (CEDICT). New data source + license/attribution (JMdict/EDRDG precedent, T-036). Looks like a vocab/kanji-seed clone but L -> opus. (If judged pure pattern-clone, sonnet works too.) |
| 6b | T-001 | sonnet | M | Inburgering mock exams (nl-specific). Follows the lesson/exercise pattern. |

Warning: **shared-global**: both may touch nav + `profile-options` + the i18n
string table -> merge those files last; verify the fence before starting.

**Wave 7: p3 (T-004 solo/parallel):**
| Item | Ticket | Model | Effort | Note |
|---|---|---|---|---|
| 7a | T-004 | sonnet | S | Overview LLM commentary layer. Small, solo, narrow file set. |

**Wave 8: skill tree (solo, TWO-PHASE):**
| Item | Ticket | Model | Effort | Note |
|---|---|---|---|---|
| 8 | T-002 | opus | XL | Branching lesson graph. **Decision gate:** branching UX + data model needs Burak's approval -> agent explores+proposes in Phase 1 and ends its turn; Burak decides, then Phase 2 implements. Not shareable, solo only. |

**Awaiting decision (not sequenced):**
- T-043 (deferred): multi-tenant, gated on the public/monetize decision (after T-040).
- T-030 (reverted): retry the ja dictionary; needs Burak's decision + a Jisho-style prototype as a precondition.
- T-023 (parked): the vocab leg of the Haiku content QA. Picked up once vocab content is filled in.

---

## Roadmap (2026-07-22 sprint, rev2)

Same rules as before: one step = one session, push to main when done;
parallel steps in separate worktrees + branches, smaller one merges first, the
second rebases. The 2026-07-18 lesson still applies: VERIFY file-set separation
before starting parallel work, don't assume it.

Wave 1 complete (T-033 + T-024 + T-027, 2026-07-22). Rev2: T-034
(job queue panel, the permanent fix for T-024) placed in wave 2.

Wave 2 complete (T-034 + T-025 + T-028, 2026-07-22): 3 parallel isolated
worktree agents (2a opus, 2b/2c sonnet); file sets turned out genuinely
separate, all 3 merges conflict-free (order: 2c -> 2b -> 2a). On merged main tsc
is clean, 58/58 tests, parity ALL PASS, build:static 5/5 (the first 2 failures
were transient, confirmed no regression against baseline). Behavior change: orphaned
queued jobs no longer auto-run on boot (pending_approval + "continue?" in the panel).
Next: step 3 (T-031, SERIAL).

| Step | Ticket | Mode | Model | Note |
|---|---|---|---|---|
| 2a | T-034 | parallel ok | opus | **done**: queue panel; core/jobs + new routes + two UI surfaces + static parity; L, architecture-heavy. p1: token protection, earliest slot |
| 2b | T-025 | parallel ok | sonnet | **done**: onboarding Load/New, calls the import flow (T-024 done). WARNING: 2a touches client-api.ts; verify overlap before starting, T-025 should call import through the existing function and not edit client-api |
| 2c | T-028 | parallel ok | sonnet | **done**: settings chip, StatsHeader; separate file from 2a's in-Settings panel, no conflict |
| 3 | T-031 | SERIAL, solo | opus | **done**: content language isolation; out-of-scope srs/chat leak -> T-035 |
| ops-1 | - | after blast finishes | - | re-export `seed:grammar` + `seed:kanji` + `seed:vocab` -> commit -> Pages deploy. No ticket opened (content generation = ops rule). The tr library completes with this |
| 4a | T-030 | parallel ok | opus | **REVERTED**: ja dictionary merged, content quality unacceptable despite 2 fix rounds (entry matching bug), ripped out. Retry depends on Burak's decision; precondition: Jisho-style presentation prototype approval, then data. ops-2 dropped with this |
| 4b | T-032 | parallel ok | opus | **done**: Drive sync + save UX, both phases complete. Open ops: Google Cloud client ID + a real connect-backup-restore run (Burak) |
| 4c | T-035 | parallel ok | opus | **done**: option A (lang columns), SAVE_SCHEMA_VERSION 7->8. Open ops: v8 save re-export (Burak) |
| 4.5a | T-036 | parallel ok | sonnet | Attribution page; CLOCK RUNNING: the deploy still carries a JMdict subset (kanji lookup), so the EDRDG attribution requirement stays active even after the ja dictionary was ripped out. Must land BEFORE T-026: let the scan see the final state |
| 4.5b | T-037 | parallel ok | sonnet | Vocab index lazy import (~692 KB zh eager bundle); must finish before T-026 since it's a code change |
| 5 | T-026 | LAST | opus | **done**: security review complete (below). |

### Wave 5 result (2026-07-22, T-026 security review)

Method: 6 parallel read-only discovery agents (8 attack surfaces) -> every
actionable finding went through fable-verifier (task: refute it) -> 2 empirical tests
run by the orchestrator. Blast off, tests used a temp DB in scratchpad, no second
build/dev (read the existing `out/`). Verdicts: the bridge exploit chain +
save/key findings were stamped CONFIRMED/PLAUSIBLE.

Finding -> ticket mapping:
- **T-039** (p1, frame A, CONFIRMED): bridge CSRF quota-burn + DNS-rebinding
  exfil. Three POST variants fired empirically, all reached the CLI. **Exploitable
  today** (for the user running the bridge). Proposed for wave 5.1.
- **T-040** (p1, frame B): server-mode auth gap (export/import + all
  mutating routes unauthenticated, single global DB). Not exploitable today
  (deploy is static, server is localhost); blocker for the public pivot. Gated on the
  "go public" milestone, not 5.1.
- **T-041** (p2, frame A): save import: a malicious trigger runs post-swap
  (empirical, SQL-only, no RCE) + no static import size cap + S2 magic-header.
- **T-042** (p3, frame A/B): save export raw_output -> LLM key leak path (only
  if a custom/bridge endpoint echoes the Authorization header).

Accepted risks (recorded in T-026, no ticket opened): job route IDOR
(not exploitable in shipped builds), feedback screenshot warning scoped to /settings
(safe today, password-field masking), npm audit highs (drizzle-orm SQLi
unreachable; esbuild/sharp/postcss are dev/build-only).

CLEAN (no finding, verified): no leak in the static `out/` + no owner-sub wiring
(import-graph + bundle grep); LLM output -> UI has no XSS (react-markdown
without rehype-raw, everything React-escaped, payload test empirically inert); Drive
OAuth (token memory-only, appdata scope, client-id/secret not embedded, no exfil).

Wave 4 / blast coexistence notes (2026-07-22): blast runs intermittently
(start/stop), doesn't wait for wave 4. (1) Quota: blast + opus
sessions share the same Max subscription, don't overlap the same hour.
(2) T-035's v8 migration was applied locally; no more conflict with blast.
(3) ops-1 can be done with partial content too (vocab 1400/4991 precedent),
doesn't have to wait for blast to finish.

License: deliberately deferred (no customers; unlicensed public = all rights
reserved). One rule: no external PRs before the license decision. A ticket will
open at the public-launch/first-customer threshold (proposal: FSL-1.1-Apache-2.0).

## Roadmap (2026-07-18 sprint)

Each step is implemented in its own session; push to main when a step is done
(T-008 decision: direct to main). Parallel steps in separate worktrees + branches,
merge order: smaller one first, the second merger rebases and resolves conflicts.

| Step | Tickets | Mode | Suggested model | Note |
|---|---|---|---|---|
| 1 | T-014 + T-013 | serial, first | sonnet | Live bug; same area (basePath + profile meta cache), single session, **done** |
| 2a | T-022 | parallel ok | sonnet | Lesson prompt + UI, **done** |
| 2b | T-018 | parallel ok | sonnet | Delete quest code, **done**. Note: the "file sets are separate" assumption was wrong, there was a three-way conflict across 4 files (llm-gen.ts, client-api.ts, LessonPlayer.tsx, QuestPlayer.tsx modify/delete); resolved via cherry-pick order (T-018->T-022->T-020); re-verify the file-set assumption before the next parallel step |
| 2c | T-020 | parallel ok | sonnet | globals.css + font/lang attribute, **done** |
| 3 | T-019 | done | sonnet | Seed infrastructure done (export script + applyVocabSeed, four wiring points matching grammar 1:1). Content fills in the background via blast; the full re-export ops step is step 3. |
| 4a | T-021 + T-006 | parallel ok | opus | Same files (conjugation/*), single session; content-heavy, **done**. Note: T-021's content had already shipped in f587ab9 (the ticket text was stale, just closed); T-006 was the one real piece of work, `splitSeparable` extended with a curated `WEAK_SEPARABLE_BASES` list (not an open heuristic; simple verbs that happen to start with op-, like opperen/openen, were being split incorrectly) |
| 4b | T-016 | parallel ok | opus | Global search MVP (cmd+K palette), **done**. Decision: scope limited to directories; a `/stroke?char=` deep link added for kanji results (no separate kanji route). Layer 2 (cmd+F intercept) not done. |
| 5 | T-017 | serial | sonnet | MVP: GitHub issue prefill + html2canvas, **done**. Decision: target = GitHub Issues (a `feedback` label was created in the repo); screenshot via html2canvas-**pro** (Tailwind 4 color-mix/oklch breaks classic html2canvas) -> clipboard, the user pastes it into the issue. Dev indicator moved from bottom-left to bottom-right (button collision). |
| 6 | T-015 | last | sonnet | **done**. Note: the ticket's premise was wrong, the master-detail/stroke/map panel was already stacked on mobile. The real break: the map bubble used a fixed-px offset that overflowed on narrow screens -> switched to viewport-relative. Onboarding padding was slightly tight -> eased. Chat composer keyboard behavior was not verified on a real device (the Chrome resize tool didn't reliably change the viewport in this session). |

Content generation is ops, no ticket opened; runs through the blast panel
(`node scripts/blast-dashboard.mjs` -> :4646). Sequenced ops list:
1. Next quota window: start from the panel; ~570 kanji + 4989 vocab remaining.
2. Once vocab is done, the vocab leg of T-023 (kanji/grammar audits already done, clean).
3. Done (2026-07-18): `seed:grammar` + `seed:vocab` + `seed:kanji` (new; the
   packaged seed infrastructure for kanji was added in this step) re-export ->
   commit -> Pages deploy. Vocab shipped at 1400/4991 (deliberate; a
   re-export once the rest is generated is enough); kanji 2201, grammar 554 complete.

Out of sprint scope (not sequenced): T-001, T-002, T-004, T-005.
