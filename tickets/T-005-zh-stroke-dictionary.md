---
id: T-005
title: zh yazım sayfası + hanzi sözlüğü (ja paritesi)
status: backlog
priority: p2
effort: L
confidence: medium
depends: []
created: 2026-07-17
---
ja'daki kanji sözlüğü + stroke trainer'ın zh karşılığı yok. Gerekenler:
- hanzi-writer-data (zh) dep + strokes route'una dil dispatch'i
- StrokeTrainer'ın zh modu (kana sekmeleri yerine HSK seviye listesi)
- HSK hanzi index (kanji-index pattern'i) + CC-CEDICT subset vendoring
  (jmdict pattern'i) → tooltip'in zh karakter anlamları da bundan beslenir
  (şu an LLM-çeviri cache'i kullanılıyor, CEDICT daha zengin olur)
