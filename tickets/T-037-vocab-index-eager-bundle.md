---
id: T-037
title: Vocab index eager bundle, every profile loads ~1.8 MB of dictionary JSON
status: done
priority: p2
effort: M
confidence: high
depends: []
created: 2026-07-22
---
Opened by T-030. `src/lib/vocab-index/index.ts` statically imports both
zh-data.json (~692 KB) and ja-data.json (~1.1 MB). `vocabIndexFor` +
`buildSearchIndex` reach into this index; `buildSearchIndex` is called
from the global `CommandPalette` (layout.tsx, mounted on every page).
Result: regardless of language (including an nl profile, which has no
vocabulary dictionary), ~1.8 MB of dictionary payload ships to the client
on first paint. The grammar/kanji indexes follow the same pattern;
the problem is general, but vocab is the two biggest files.

Suggested direction: a per-language dynamic `import()` (lazy loader)
inside `buildSearchIndex(lang)` / `vocabIndexFor(lang)`; only the active
profile's language loads. **CommandPalette sync->async implication**:
`buildSearchIndex` is currently set up synchronously via `useMemo`; a lazy
import turns it async -> the palette's index setup becomes a Promise, a
"loading" state + an await on first open are needed. The same lazy
pattern can be applied to the grammar/kanji indexes (separate step).
Metric: on an nl profile, first-load JS should drop both dictionary JSON
files.

Note: verify whether static export (NEXT_PUBLIC_STATIC_BUILD) splits
dynamic imports into separate chunks; it does, but the palette's await
still needs to work in static mode too.

---
Status (2026-07-22, wave 4.5): done; shared first-load JS 451->239 kB
(zh-data ~708 KB dropped into its own chunk, not present in any page's
HTML; also verified in the static export). Critical finding: putting the
dynamic import in the SAME module as the sync `vocabIndexFor` doesn't
work; webpack sees the static import and inlines it; sync/async need two
separate modules (`vocab-index/index.ts` + `vocab-index/async.ts`).
Grammar/kanji lazification (a separate step) will need the same
two-module pattern. Note: the ticket's "~1.8 MB of two JSON files" claim
was stale; the ja vocab index was already gone via the T-030 revert,
only zh remained.
