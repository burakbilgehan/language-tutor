---
id: T-035
title: SRS card back + chat history language stamp (T-031 scope leftovers)
status: done
priority: p2
effort: S
confidence: medium
depends: []
created: 2026-07-22
---
The last two tr-leaks deliberately left out of scope at T-031's close
(Burak's call: same class, separate ticket):

1. **`srs_cards.back`**: native text, no language stamp; dedupe is on
   `(profileId, itemType, front)`. A user who accumulates cards in tr and
   switches to en sees a Turkish back side on /review
   (`onConflictDoNothing` doesn't overwrite).
2. **`chat_messages.content`**: past teacher messages stay in the
   language they were generated in.

Design fork (to decide during implementation, both legitimate):
- **A. Schema stamp**: an `srs_cards.lang` column -> SAVE_SCHEMA_VERSION
  7->8 (v7 just landed this sprint; a second bump annoys old saves one
  more round; know the cost). When a wrong-language card back is
  displayed, it's translated via the translations cache (the cache has
  been native_language-keyed since T-031), card data isn't touched.
- **B. Schemaless**: no stamp; the review UI always runs the back side
  through the translations cache (for a same-language cache
  hit/no-op guarantee, language detection would be needed first; CJK/
  Latin split is crude and insufficient for tr<->en). B's detection
  weakness is real; A is cleaner, whether the bump is worth it is an
  implementation-time call.

Recommendation for chat: don't touch history (it's a conversation
record); a generation-language tag on the message bubble + confirmation
that new messages already flow in the correct language is enough. No
deleting/translating.

Verification: profile with tr cards -> switch to en -> /review back sides
show in en (translated from cache, LLM call only on first time); switch
back to tr -> original text; SRS due counts never change; chat history
stays unmodified and labeled.

Closing (2026-07-22): option A was implemented; `srs_cards.lang` +
`chat_messages.lang` in a single bump (SAVE_SCHEMA_VERSION 7->8). The back
side, on reveal, is rebuilt from the front->native translation cache
(cachedOnly pre-warm + a single LLM call on miss, falls back to the
stored back on failure); the dedupe index and SRS scheduling were left
untouched. Chat history is immutable, bubbles get a generation-language
tag. The server side needs an `npm run db:push` migration (browser images
self-heal). Old v7 export files are rejected on v8 import; a single
re-export after upgrading is enough.
