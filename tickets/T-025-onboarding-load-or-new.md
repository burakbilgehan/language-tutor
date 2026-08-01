---
id: T-025
title: "Load save / Start new" entry screen for onboarding
status: done
priority: p2
effort: M
confidence: high
depends: []
created: 2026-07-22
---
Save import currently only lives in Settings. A user who has a saved save
opens an empty session, answers all of the wizard's questions first, waits a
long time if there's no LLM connection, then finds import and overwrites
everything. It should be like in games: the FIRST screen of an empty session
is two cards:

- **Load save**: file picker -> existing import flow (replace-all, version
  check). On success the wizard is skipped entirely, drop into /map.
- **New game**: continue from wizard step 0 as-is.

Notes:
- Should work in both modes (server `/api/save/import`, static browser image
  replace), call the same flow as Settings, don't copy code.
- Screen copy via `pick(S, draft.uiLanguage)` like onboarding, no profile yet.
- "Empty session" detection: no profile exists at all. This screen doesn't
  show when a profile exists.
- Consider together with T-024: an imported save must not carry over the job
  queue.

Verification: clean profile (clean IndexedDB in static mode) -> Load/New
screen on first open; load a save -> straight to the map without the wizard;
Start new -> the existing wizard unchanged.
</content>
