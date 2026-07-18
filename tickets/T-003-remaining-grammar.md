---
id: T-003
title: Kalan grammar üretimi (zh 99 + ja 16)
status: done
priority: p1
effort: S
confidence: high
depends: []
created: 2026-07-17
---
Kota penceresi bitince kaldı: zh 85/184, ja 282/298. Hafta sonu kota
yenilenince tek seferde kapat (~1 saat, c=3):

    # worker: LLM_CONCURRENCY=3 PORT=3210 npm run dev -- --port 3210
    # aktifken: POST /api/grammar/generate-batch {} (ja aktif profilde)
    # zh için: switch → batch → switch geri (bkz. git log'daki akış)

Error'daki job'lar otomatik canlanmaz; batch çağrısı şart. Kanji N1
kuyruğunu BAŞLATMA (T-007, düşük değer).

**done (2026-07-18)**: Bugünkü blast koşuları kapattı — grammar_topics
554/554 ready, pending/error sıfır. `seed:grammar` re-export bekliyor
(arka plan pipeline, T-023 QA sonrası).
