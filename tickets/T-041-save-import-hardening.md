---
id: T-041
title: Save import hardening (malicious trigger + static size cap)
status: done
priority: p2
effort: M
confidence: high
depends: []
created: 2026-07-22
---
T-026 wave 5 finding. **Threat frame A**; a user is socially engineered
into uploading someone else's `.db`/save file. The findings passed
fable-verifier; S1 was empirically confirmed by the orchestrator running
the full scenario.

**S1; LOW, CONFIRMED (empirical).** `src/lib/save/import.ts:122-129`.
Validation opens the file `readonly` (45) and only runs `integrity_check`
+ `SELECT`; these don't fire triggers. But once the file becomes the
live DB after the swap, `db.update(generationJobs)...run()` (and
subsequent app writes) run on a read-write connection; any trigger the
attacker planted on `generation_jobs` (or any table the app touches)
fires there. Empirical test: a version-matching (v8 `save_meta`) DB probe
with an `AFTER INSERT ON srs_cards ... DELETE FROM profiles` trigger
PASSES validation, and the profiles table gets wiped on the app's first
write. Impact is limited: `load_extension` is "not authorized"
(better-sqlite3 default off, the code never enables it anywhere) -> the
trigger is limited to SQL-level data manipulation, no RCE/file access.
Scope is the user's own (already replace-all-deleted) data + a
recursive-trigger DoS.

**S4; LOW, PLAUSIBLE.** `src/lib/client-api.ts:596` +
`src/db/browser.ts:264` + `OnboardingWizard.tsx:185`. The 100 MB guard
exists ONLY in the server route (`import/route.ts:6,20`); the static/
browser and onboarding load path feeds an arbitrarily large file directly
into wasm -> a multi-GB "save" -> wasm OOM / tab crash. Self-DoS.

**S2; LOW/near-noise, PLAUSIBLE (also flagged as a rider on T-040).**
Server import does parse-then-check: `import.ts:44-48` hands the
attacker's bytes to `new Database` + `integrity_check` BEFORE the version
gate (65); the browser path has a 15-byte magic-header pre-check
(`save-image.ts:63`), the server doesn't. Marginal (integrity_check
already parses the whole file, libsqlite3 is fuzz-hardened, opened
readonly); cheap defense-in-depth.

Suggested direction: (S1) instead of swapping, copy validated rows into a
clean schema (doesn't carry over triggers/views), or DROP any
user-defined trigger/view after import; (S4) apply the same size cap to
the static/onboarding path as the server; (S2) add the magic-header
pre-check to the server too. S2 preferably ships together with T-040.
