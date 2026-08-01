---
id: T-031
title: Content language isolation, switching to en must not still show Turkish
status: done
priority: p2
effort: M
confidence: medium
depends: []
created: 2026-07-22
closed: 2026-07-22
---
## Closing (2026-07-22)
Branch `t-031-content-language-isolation`, 3 commits. Plan: `T-031-PLAN.md`.

**Layer 2 (content):** The 4 JSON-content surfaces (lesson/grammar/kanji/vocab)
became a lang-keyed map `{tr,en}`; an in-place generation does NOT overwrite
but MERGEs, so a tr->en->tr transition returns the old content exactly
(fable-verifier CONFIRMED, 14 assertions). Since exercises are a side table, an
`exercises.lang` column was added (body stays a map, exercises are
lang-scoped delete/insert; the other language's attempts are preserved). Job
queues (ensureLessonJob/queueMissingLessons/queueKanjiLevel/batch routes)
queue rows that aren't ready in the current language. Packaged seeds are tr,
so `applyX` seed is gated on `nativeLanguage==="tr"`, stamped `{tr:...}`.
Native_language was added to the translations cache key (this also closed a
pre-existing tr/en collision bug). Curriculum titles are a plain column: a
`curricula.content_lang` stamp + wrong-language titles are nulled OUT on the
SERVER in the roadmap payload + a "translate to this language" action in place
(progress/SRS preserved). A cost warning on Settings language change. Partial
translation is rejected (leak guard).

**Layer 1 (hardcoded tr):** JSX was clean; the leak was in error strings.
Stable error-code contract (`src/lib/errors.ts` + `i18n/errors.ts` +
`useLocalizeError`); routes return `{error: code}`, localized at the UI
boundary, unknown codes fall back to generic (raw tr never renders). 27
routes + client-api + 18 catch sites + SaveImportError.

**Schema:** SAVE_SCHEMA_VERSION 6->7 (translations.native_language,
curricula.content_lang, exercises.lang) + browser ADD COLUMN self-heal + DDL
regen. Verification: tsc clean, 58 tests, sql.js parity harness green,
fixture build.

**Deliberately out of scope (same class, worth a separate ticket; Burak's
call):**
- `srs_cards.back`: native text, no language stamp; dedupe is on
  `(profileId, itemType, front)`. A user who accumulates cards in tr and
  switches to en sees a Turkish back side on /review
  (`onConflictDoNothing` doesn't overwrite).
- `chat_messages.content`: past teacher messages stay in the language they
  were generated in.
These weren't in the ticket's sequenced scope; adding a stamp would need an
SRS/chat schema change. Candidate for a follow-up ticket.

overview.ts checked: returns only aggregates + level label (levelDisplay,
language-neutral); NO title leak.
---
Symptom (Burak, live): switching to English still shows Turkish things.
There are two separate layers, both need handling:

1. **Hardcoded Turkish** (things left out of the S table): e.g.
   `client-api.ts` error messages ("Profil yok" [No profile], "Müfredat hazır değil"
   [Curriculum not ready]), route errors, likely other leaks. Sweep: a
   repo-wide Turkish string-literal scan -> all of it into the co-located S
   table or server `pick()`.

2. **Cached LLM content**: `_tr` fields mean "in the student's native
   language"; content is written with the nativeLanguage that was active AT
   GENERATION TIME but carries NO LANGUAGE STAMP. When nativeLanguage
   changes tr->en, the old Turkish content is served as-is. Decision
   (Burak): generated content should be stamped with a language code; when
   the language changes, treat that language's content as if it doesn't
   exist (drop to pending / regenerate).

Design notes (to be settled during implementation):
- Stamp location: a separate column = schema change = SAVE_SCHEMA_VERSION
  bump. Alternative: a `lang` field inside the content JSON (json columns
  are flexible, no schema bump). Unstamped legacy rows = assume "tr" (tr
  was the default). Whichever is chosen must be reflected in the zod
  schemas (schemas.ts).
- Scope: lesson content, grammar_topics.content, kanji_entries (Turkish
  meanings/examples), vocab_entries content, translations cache,
  curriculum titles/descriptions (units.titleTr etc.; these are not json,
  they're columns; the hardest case, maybe just a "regenerate" button).
- **Packaged seeds are Turkish**: grammar/kanji/vocab seed JSON carries tr
  content. Seed files also need a language stamp and must NOT be applied to
  an en-native profile (otherwise an "English content shows Turkish
  content" error would come back through the seed path). An en user
  generates content from the LLM.
- UX: nativeLanguage change is in Settings; the user should get a cost
  warning at the moment of the change ("cached content doesn't exist in
  this language, it will be regenerated"). Content is not deleted; going
  back to tr shows the old content again (once the stamp matches).

Verification: content generated with a tr profile -> switch nativeLanguage to
en -> content falls to "not prepared" state, generated in en via LLM; switch
back to tr -> old Turkish content comes back exactly as it was; seeds are not
applied to an en profile.
