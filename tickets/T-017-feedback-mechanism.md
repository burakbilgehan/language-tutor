---
id: T-017
title: User feedback mechanism (problem description + suggestion + screenshot)
status: done
priority: p2
effort: M
confidence: medium
depends: []
created: 2026-07-18
---
The site is live; user feedback needs somewhere to land. Two kinds of input:
problem reports (should be describable with a screenshot) and suggestions
(let the user do product management). UI: a small "feedback" button
accessible from every page -> modal (type selection, description, optional
screenshot).

Constraint: static deploy (GitHub Pages), no backend. Options:
1. **GitHub Issues prefill URL**: open via
   `github.com/.../issues/new?title=&body=`. Zero infrastructure but no
   screenshot upload (the user has to drag it into the issue themselves) and
   requires a GitHub account.
2. **Form service (something like Formspree/Getform)**: works anonymously,
   supports file attachments, lands in email. Free tier has limits.
3. **Own endpoint (Cloudflare Worker + a token that opens an issue in the
   repo)**: cleanest UX (anonymous + screenshot -> issue as base64/asset),
   but the first server-side component in the project.

Recommendation: MVP = option 1 + preparing the screenshot for the user's
clipboard/download (capture the page with html2canvas, user pastes it into the
issue); move to option 3 if volume grows. Decision to be made in the
implementing session, the difference between the options is UX, not
architecture.

Note: screenshot capture (html2canvas or `getDisplayMedia`) works in static
mode; since LLM configuration/personal data could leak into the screenshot,
show a settings-page warning.

---
Implementation (2026-07-18): option 1 (GitHub Issues prefill).
`FeedbackButton.tsx` (global in the layout, bottom left): type selection +
description + viewport screenshot -> clipboard (PNG download fallback if no
clipboard) -> prefilled issue page. Used `html2canvas-pro`, Tailwind 4's
color-mix()/oklch output breaks classic html2canvas. Modal/button excluded
from capture via `data-feedback-ignore`; personal-data warning on /settings.
Metadata: page, mode (static/server), target language, UA. A `feedback` label
was created in the repo (the `labels=` in the URL is only auto-applied for
users with write access; it's dropped for anonymous users, not a problem).
Next dev indicator moved from bottom-left to bottom-right (next.config
`devIndicators.position`). Moving to a Cloudflare Worker if volume grows is
still an open option.

Revision (same day): the prefill MVP was judged insufficient (requires a
GitHub account, manual screenshot, title=desc duplication) -> option 3 added:
the `workers/feedback/` Cloudflare Worker takes the POST, OPENS the issue in
the repo with the owner's fine-grained PAT (secret GITHUB_TOKEN, anonymous
user, no account needed), and commits the screenshot to the `feedback-assets`
branch via the contents API and embeds it in the body as a raw URL. Client: if
`NEXT_PUBLIC_FEEDBACK_URL` is set, JSON POST to the Worker (screenshot as jpeg
dataURL), otherwise falls back to the old prefill. A separate optional
"Title" field was added to the modal; the title is now
`[Sorun] title|page` ("[Issue] title|page"), the description is body-only.
Deploy: wrangler login + `secret put GITHUB_TOKEN` + deploy; the Worker URL
flows into pages.yml as the repo variable NEXT_PUBLIC_FEEDBACK_URL (also has a
default in code, env only overrides, "off" forces the prefill). Anti-abuse:
origin allow-list + size limits (Turnstile added if it turns into spam).

**If the PAT expires (symptom: sending feedback returns a "Gönderilemedi"
("failed to send") error, Worker returns `github_401`):**
1. https://github.com/settings/personal-access-tokens -> new fine-grained
   PAT: only the `language-tutor` repo, Issues: Read+Write,
   Contents: Read+Write.
2. `cd workers/feedback && npx wrangler secret put GITHUB_TOKEN`
   -> paste the new token at the prompt. No deploy needed, the secret takes
   effect immediately.
   (if the wrangler session also expired, run `npx wrangler login` first.)
3. Test: send a feedback report from the site, or
   `curl -X POST https://kumo-feedback.burakbilgehan-p.workers.dev
   -H 'Content-Type: application/json'
   -H 'Origin: https://burakbilgehan.github.io'
   -d '{"kind":"bug","desc":"token test"}'` should return `{"ok":true,...}`;
   close the resulting test issue.

Known secondary risks (accepted): the CF free tier's 10ms CPU limit can rarely
return 1102 on very large (2MB+) screenshots, if this becomes frequent, cap
jpeg quality/size client-side; the `feedback-assets` branch will grow over
time, can be deleted and reopened (breaks images in old issues).
</content>
