---
id: T-006
title: nl weak separable verbs (opbellen -> opgebeld)
status: done
priority: p3
effort: S
confidence: high
depends: []
created: 2026-07-17
---
splitSeparable only splits STRONG-based verbs; a weak separable verb (opbellen)
gets treated as plain weak and produces *geopbeld (correct: opgebeld, belde ...
op). Fix: SEP_PREFIXES plus a heuristic for whether the remainder is a valid
verb (consonant start + length), or a small list of common verbs. Add
opbellen/aanraken/uitleggen to the tests.

## Solution (2026-07-18)
`splitSeparable` now also checks a curated `WEAK_SEPARABLE_BASES` list beyond
the STRONG table (bellen/raken/leggen/... common weak verb stems). A curated
list was chosen over an explicit heuristic (consonant-start + -en): verbs like
`opperen`/`openen`, which happen to start with op- but are simple weak verbs,
would have been split incorrectly (opperen -> *oppeerde instead of opperde,
etc.). Tests: opbellen/aanraken as positive cases, opperen/openen as negative
guards. `uitleggen` was already correct via the STRONG path (leggen is in the
table), no regression.
