---
id: T-043
title: Real multi-tenant isolation (per-user DB / profile ownership)
status: backlog
priority: p3
effort: XL
confidence: low
depends: [T-040]
created: 2026-07-26
---
Rescoped by T-069 (2026-08-10): the server runtime this ticket wanted to
isolate no longer exists; self-hosting is now static files + the Worker
backend, whose per-user tenancy already ships (T-046/47). Kept in backlog
only as a pointer; close it on the next backlog sweep unless a new server
runtime appears.

Split off from T-040 (2026-07-26). T-040's env-token gate CLOSES server
mode to non-localhost access (single operator = owner). This ticket goes
beyond that: the **real multi-user** scenario; every user should see
only their own data, be unable to cancel another user's job, and save
export should return only their own data.

**Rescoped (2026-07-26):** the "monetization is undecided" gate that
justified deferring this has changed; the backend/identity work
(T-045–T-048) has been decided (Cloudflare + better-auth + R2).
**Cloud-save tenant isolation now belongs to that work** (a logged-in
user only accesses their own `saves/{userId}`; T-046/T-047 security
criteria). This ticket's REMAINING scope: **server-mode**
(localhost/self-host Next.js) multi-user isolation; splitting the
single global `data/app.db` per user. This is still deferred: server mode
is single-user today (T-040's env-token gate is sufficient); untouched
until a real self-host multi-user demand shows up. So T-043 = "not the
backend, self-host Next.js multi-tenancy."

Scope (per the design decision): (1) job route IDOR; add a tenant
column + scope to `generation_jobs` (`core/jobs.ts:78` today is "NO
profile scoping"); (2) tenant-scoped save export/import; (3) tenant
filtering on all read/mutating routes; (4) per-tenant isolation at the DB
layer. The job IDOR flagged as an "accepted risk" in T-026 wave 5 gets
closed by this ticket.

Precondition: the public/monetize decision (INDEX license note; the FSL
proposal threshold). Untouched until that threshold is reached.
