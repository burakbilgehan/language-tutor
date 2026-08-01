---
id: T-072
title: Job identity + result cache in the bridge: refresh/disconnect must not kill generation, a finished job must not be lost
status: done
priority: p2
effort: M
confidence: medium
depends: []
created: 2026-08-01
---

## Incident (2026-08-01, during the masu-form verb lockup)

The actual lock was a schema bug (the retry wasn't passing schemaHint; fixed the same day: `prompt + schemaHint` on all three providers, `bridge_json_schema` -> `claude --json-schema` for the bridge). But during the incident a second, genuine loss was observed: a page refresh aborts the in-flight fetch, and the bridge (8be11c0, for a valid reason) kills the CLI process too. 2-3 minutes of generation goes to waste; the new page starts the same generation from scratch. Some of the "cancel: client gave up" lines in the bridge logs were exactly this.

## Requested behavior (Burak's ask)

A pending job and a job running in the bridge should be tied together by a unique id; no job should ever end up orphaned:

- The app generates a `bridge_job_id` for every logical generation (e.g.
  `lesson:<nodeId>:<attemptNonce>`), storing queueKey -> id in localStorage.
- Bridge: if the connection drops on a job with an id, it does NOT kill it; it lets it finish and writes the result into a TTL'd (e.g. 10 min) in-memory cache.
- A new request with the same job_id: if the job is still running, ATTACH (wait on the same result); if it's already finished, return instantly from the cache. After a refresh, the page re-requests with the same id and picks up where it left off.
- The user's ACTUAL cancel is a separate path: an explicit cancel signal (e.g.
  `POST /v1/cancel {job_id}`, or job_id-less request semantics) still kills the CLI as it does today. The "Cancel" button's meaning must not change (T-070-C).

## Implementation (2026-08-01, same day)

- Identity is DETERMINISTIC, not localStorage-based: SHA-256(model+system+prompt)
  (`computeBridgeJobId`, browser-provider). A refresh reconstructs the same prompt, attaches to the running job with the same identity or reads it from cache; no storage needed. A retry's prompt (zod errors get appended) naturally produces a different identity.
- Bridge: a `jobs` map; a dropped connection on a job with an identity doesn't kill the CLI (cancel.keepAlive); an orphaned SUCCESSFUL result waits with a 10-minute TTL and is delivered EXACTLY ONCE (consume-once: so a regenerate doesn't eat a stale result). Errors/cancellations are not cached. A second request on a running job ATTACHes (multiple tabs share the same job, no second CLI spawned).
- Real cancel: `POST /v1/cancel {job_id}`; the client sends this only on a user-initiated cancel (NOT on a timeout abort: so the job can finish orphaned and land in cache).
- Verification: 3 flows tested live on the bridge: a dropped client -> "finished orphaned" + 17ms cache delivery; /v1/cancel -> CLI kill.

## Watch out for

- Store/queue dedup (lesson-gen-store + browser-queue) already dedupes on the client side; this ticket closes the loss on the bridge side.
- Old bridge / old app combinations should ignore the field gracefully (the bridge_* body-field convention).
- The cache holds raw LLM output; no token/cost impact, but RAM must stay bounded and TTL'd.
