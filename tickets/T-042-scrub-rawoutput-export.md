---
id: T-042
title: Scrub the provider error body (raw_output) from save export
status: done
priority: p3
effort: S
confidence: high
depends: []
created: 2026-07-22
---
T-026 wave 5 finding (K1). **Threat frame A/B; LOW, PLAUSIBLE.** The
finding passed fable-verifier; all three load-bearing links were
verified.

Chain: `src/lib/jobs.ts:473-478` writes the provider's raw HTTP error body
(`err.rawOutput`, capped at 20k) into `generation_jobs.raw_output`
(`http-provider.ts:78-86` / `anthropic-http-provider.ts` pass the full
response body into `rawOutput`). `src/lib/save/export.ts:30-34`'s
`snapshotWithoutJobQueue` only strips `queued`/`running` rows; `error`
rows, with their rawOutput, END UP in the shareable save snapshot. This
defeats the design intent of `config.ts:5-9` (keep the key out of the DB
so it can't leak into a shared save).

Why LOW: leaking requires the user's *custom/bridge* endpoint to echo the
`Authorization` header back into the error body. Mainstream providers
(OpenAI/Anthropic/DeepSeek) return structured error JSON and don't echo
back the sent key; the precondition only holds for a naive self-hosted
bridge / a misconfigured proxy. Also, rawOutput never reaches the client
LIVE (`jobs/[id]/route.ts:16-20` only returns id/status/error); it only
leaks via the save export path.

Suggested fix (cheap): in the export snapshot, alongside the existing
job-queue scrub, also NULL the `raw_output` of `error` rows (or exclude
`error` rows from the export entirely). Alternative: redact
`Authorization`/`Bearer` patterns when persisting rawOutput in the first
place.
