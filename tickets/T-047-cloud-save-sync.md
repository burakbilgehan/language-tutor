---
id: T-047
title: Cloud save-sync (R2 blob + seed-strip + client seam, manual push/pull)
status: done
priority: p1
effort: L
confidence: medium
depends: [T-046]
created: 2026-07-26
---
A logged-in user backs up / restores their own save to the cloud. **The R2
twin of the T-032 Drive controller**: same architecture (blob-as-is), R2
instead of Drive as the target.

- **Blob-as-is:** SQLite snapshot to R2 (`saves/{userId}/latest.db` + optional
  versioned history). The backend doesn't know the save format, it just
  stores it. The existing export/import contract is preserved. `schemaVersion`
  lives in metadata (D1), so mismatched versions are rejected.
- **Seed-strip on upload (from T-045 measurement, a 5-10x saving):** of a 19 MB
  save, about 13 MB is seed-derived content (vocab_entries/grammar_topics/
  kanji_entries, all present in the CDN's `public/*-seed`). Before upload,
  strip the `ready` content rows that came from the seed; on restore,
  `applyGrammarSeed`/`applyKanjiSeed`/`applyVocabSeed` (existing
  infrastructure) refill them from the CDN. `generation_jobs` history is
  already trimmed on export too. The blob sent to the cloud shrinks to about
  2-4 MB. (Simpler alternative considered: export only user-generated tables,
  but seed-strip was preferred because it reuses the existing restore
  infrastructure.)
- **Client seam:** a third path in `src/lib/client-api.ts`: `IS_STATIC` +
  authed -> sync to the Worker API (the Drive twin of the existing
  `src/lib/backup/controller.ts`). Auth state comes from T-046.
- **Manual push/pull (advisor: NOT auto-on-change):** a multi-MB blob on
  every write burns R2 Class A ops and the user's uplink. Like Drive, it's a
  user-triggered "push to cloud / pull from cloud." Last-write-wins via
  `updatedAt`; real multi-device sync is future work.

**Security:** T-046's CSRF/origin/auth-before-execute criteria also apply to
these routes; save upload/download is authed + tenant-scoped (a user can only
access their own `saves/{userId}`).

Fence: `worker/` (top-level, T-045's skeleton, NOT `src/worker`) +
`src/lib/client-api.ts` + `src/lib/backup/*`.
Same Worker as T-046, so **auth merges first**, then this.

**T-047 implementation decisions (2026-07-26):**

- **Strip criterion = payload equality, NOT key presence.** A row is stripped
  only if `status='ready'` AND the seed has that slug/char/word AND the stored
  `tr` payload is DEEPLY EQUAL to the seed's (run through the same zod schema).
  Checking only the key would have silently destroyed content the user
  regenerated (T-022): the slug exists in the seed but the content is theirs.
  Restore would put back the generic CDN version, the effort would be
  permanently lost, and nothing anywhere would show an error.
- **Per-language seed lookup (NOT a flat map).** `basic-word-order`,
  `personal-pronouns`, `written-vs-spoken` exist in BOTH the ja and zh grammar
  seeds with DIFFERENT content; a flat merged map would compare a ja row
  against zh content.
- **native-language gate (a found + fixed DATA LOSS bug).** All three
  `apply*Seed` functions start with `if (nativeLanguage !== "tr") return 0`;
  the packaged content is Turkish. Strip initially didn't mirror this: on an
  en-native profile, the `tr` half of a `{tr: <seed>, en: <user content>}` row
  would get deleted, and on restore `apply*Seed` REFUSES to refill it, causing
  permanent loss. Strip now only runs on profiles that are tr-native. Adversarial
  scenario in the harness: making ja en-native drops grammar strip from 554 to
  256, and all 298 ja topics are preserved.
- **Module location:** `src/lib/save/seed-strip.ts` (precedent: `limits.ts`),
  not drizzle but raw SQL through a small `StripExec` port. That way both
  better-sqlite3 and sql.js use the same code, and `src/core/*` and its
  sql.js/query-builder rule are never touched.
- **VACUUM is mandatory.** SQLite retains freed pages; without VACUUM the file
  never shrinks (measured: 17.5 MB -> 17.5 MB). Verified it also works under
  sql.js.
- **schemaVersion lives in R2 `customMetadata` (not D1):** a single write,
  no inconsistency window between blob and version, readable via `head()`
  without pulling the body. D1 would only have gained cross-user querying,
  which manual push/pull doesn't need. The backend doesn't know the format:
  the version tag is opaque, the client declares compatibility, the Worker
  only refuses to serve on mismatch (409).
- **API base:** default is same-origin relative `/api/*` (T-046 serves the
  site and the API from one origin, so no setting is needed in production).
  A localStorage override in the `readDriveClientId()` pattern exists only
  for two environments: dev (:3000 -> :8787) and the anonymous-only GitHub
  Pages mirror (unconfigured there, `/api/save` 404s, the controller says
  "no cloud", which is correct behavior on that mirror).
- **Seeds are re-applied EAGERLY on pull.** Verified (not assumed):
  `apply*Seed` is only called from the grammar/kanji/vocab LIST routes;
  `saveImportApi`/`restoreFromDrive` don't call it. This wasn't a problem for
  Drive because its blob was complete; ours is deliberately incomplete, so
  without the eager call the library would appear empty until the user
  visited all three pages. Error-tolerant: rows stay pending if offline
  (today's lazy behavior).

**Size estimate missed, the ticket's prediction rested on a wrong assumption.**
Actual: 17.54 MB -> **8.55 MB** (2.05x), predicted was ~2-4 MB. Measured cause:
even if the THREE tables' content were 100% deleted, the file still stays at
7.5 MB. Most of what remains is static index rows (13k+ vocab rows) and
**`generation_jobs` history (8,430 rows, 2.4 MB, 28% of the stripped blob)**.
The ticket says "generation_jobs history is already trimmed on export too,"
but `export.ts` only deletes `queued`/`running`; `done`/`error` history
remains. As a cheap win, it's possible to drop job history ONLY on the cloud
strip path (without touching `export.ts`, to avoid changing the local save
contract); left as a separate decision, not done here to avoid silently
widening scope.
