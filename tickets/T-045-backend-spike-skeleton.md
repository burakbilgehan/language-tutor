---
id: T-045
title: Backend spike + skeleton (Cloudflare Worker + R2 + D1 + auth end-to-end)
status: done
priority: p1
effort: M
confidence: medium
depends: []
created: 2026-07-26
---
The FIRST step of the backend/auth work; not infra, a **spike** (Burak + advisor,
2026-07-26). Goal: verify three load-bearing assumptions with evidence, not code,
to de-risk 4 downstream tickets. If it fails, change the architecture here,
not after three tickets are already written.

**End-to-end target (half a day):** "Log in with Google → get a session → write
1 byte to R2 → read it back." If this works, the stack is verified.

Assumptions to verify:
1. **Does better-auth work on the Cloudflare Workers runtime + D1 adapter?**
   Workers isn't plain Node; adapter support is where it typically breaks. Verify
   against current better-auth docs (Cloudflare skills: `wrangler`,
   `durable-objects`, `agents-sdk`).
2. **Is there a magic-link SENDER?** Cloudflare Email Routing is **inbound-only**;
   outbound email needs Cloudflare Email Sending (`cloudflare-email-service`
   skill) or Resend/Postmark. No magic-link without a sender set up.
3. **Cookie/domain story** (see T-046 decision): if the site is on GitHub Pages
   and the Worker on `*.workers.dev`, the session cookie becomes **third-party**
   and Safari ITP blocks it. In the spike, try a same-origin/custom-domain setup
   and see if it resolves without falling back to bearer-token-in-localStorage
   (that path is XSS-readable, making it dependent on the "no XSS" property we
   verify in wave 5).

Output: a working minimal Worker + `wrangler.toml` + D1 schema skeleton + R2
bucket + a report of "which assumption held / which didn't." Code doesn't need
to be production quality (it's a spike); T-046 hardens it. **Out of scope:**
save-sync logic, seed-strip, UI; those are later tickets.
