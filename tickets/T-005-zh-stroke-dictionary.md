---
id: T-005
title: zh writing page + hanzi dictionary (parity with ja)
status: backlog
priority: p2
effort: L
confidence: medium
depends: []
created: 2026-07-17
---
There's no zh counterpart to the ja kanji dictionary + stroke trainer. Needed:
- hanzi-writer-data (zh) dependency + language dispatch on the strokes route
- a zh mode for StrokeTrainer (HSK level list instead of kana tabs)
- an HSK hanzi index (kanji-index pattern) + a vendored CC-CEDICT subset
  (jmdict pattern), so the tooltip's zh character meanings also draw from this
  (currently uses the LLM-translation cache, CEDICT would be richer)
