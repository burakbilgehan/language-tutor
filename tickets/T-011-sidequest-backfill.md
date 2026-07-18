---
id: T-011
title: Mevcut nl/zh profillerine yan görev backfill
status: wontfix
priority: p2
effort: S
confidence: high
depends: []
created: 2026-07-18
---
Bug (parity testi ortaya çıkardı, 2026-07-18'de kökü düzeltildi): chapter
üretimindeki "yan görevler bir kez oluşturulur" kontrolü curriculum'a değil
TÜM nodes tablosuna bakıyordu — ja profilinin 5 görevi nl ve zh
profillerinde görev oluşumunu bastırdı. `src/core/curriculum-gen.ts`
artık curriculum-scoped bakıyor; YENİ profiller görevlerini alıyor.

Kalan: mevcut nl/zh profillerinde hâlâ 0 yan görev var ve append akışı
`isFirst` olmadığı için geriye dönük oluşturmuyor. Backfill gerek:
ya lazy self-heal (roadmap açılışında curriculum'da hiç side_quest yoksa
ilk chapter için LLM'den üret) ya da tek seferlik script. Self-heal
tercih — save import edilen eski kayıtları da düzeltir. LLM çağrısı
gerektirdiği için llmConfigured gate + job dedupe şart.

**wontfix (2026-07-18)**: Side quest özelliği tamamen kaldırılıyor (T-018,
kullanıcı kararı) — backfill anlamsızlaştı.
