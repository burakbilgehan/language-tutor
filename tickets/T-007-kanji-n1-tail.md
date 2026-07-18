---
id: T-007
title: Kanji N1 kuyruğu (997 karakter)
status: wontfix
priority: p3
effort: S
confidence: high
depends: []
created: 2026-07-17
---
N1 235/1232'de durdu. Ops işi: tek komut, ~3 saat (haiku, c=4).
Değeri düşük — kullanıcı N4 seviyesinde, N1'e yıllar var; ihtiyaç
anında `POST /api/kanji/generate-batch {"level":"N1"}` yeter.
Haiku kalitesi doğrulandı (25/25 örnek isabetli) — model endişesi yok.

**in-progress (2026-07-18)**: blast-generate conc=8-16 ile işliyor
(1355+ ready, ~570 kaldı). Sonraki kota penceresinde panelden
(`node scripts/blast-dashboard.mjs`) devam — vocab ile aynı koşuda biter.

**wontfix-as-ticket (2026-07-18)**: İçerik üretimi backlog işi değil ops —
blast paneli (`node scripts/blast-dashboard.mjs`) üzerinden yürüyor, kalan
~570 N1 sonraki kota koşusunda vocab'la birlikte biter. Ticket kapandı.
