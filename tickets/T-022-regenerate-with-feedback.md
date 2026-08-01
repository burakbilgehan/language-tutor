---
id: T-022
title: Feedback text box on the lesson regenerate button
status: done
priority: p2
effort: S
confidence: high
depends: []
created: 2026-07-18
---
Requested before, skipped, hence this todo. The lesson "regenerate" flow
currently regenerates blindly; there's a risk of producing the same mistake
again. A text box will be added to the button: the user writes what's
wrong/missing ("examples too easy", "romaji is wrong", etc.), this text gets
added to the regenerate prompt as a "problems in the previous generation,
fix these" section.

Implementation:
- UI: regenerate button -> small form (textarea, can be made required instead
  of optional; falls back to old behavior if empty). On the lesson page; the
  same pattern could apply to grammar topic regenerate (if it has one).
- Prompt: an optional `regenerationFeedback` parameter on the lesson prompt;
  follow the `nativeLanguageName()` rule (no hardcoded Turkish). User text
  enters the prompt as data (injection concern is low, it's the user's own
  LLM/session).
- The flow should work in both modes (server route + static core), add the
  parameter to the regenerate path in `src/core/lesson.ts`, keep the route/
  client-api as thin shells (CLAUDE.md seam rule).
- If the old lesson content is briefly included in the prompt as "previous
  generation," the LLM can see what it needs to fix, weigh against token cost,
  a summary is enough.

Verification: a unit test or log check in fixture mode asserting the
parameter enters the prompt; one end-to-end pass with a real LLM.
</content>
