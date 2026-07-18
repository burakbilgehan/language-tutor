---
id: T-018
title: Side quest özelliğini kaldır
status: done
priority: p2
effort: M
confidence: high
depends: []
created: 2026-07-18
---
Karar: side quest'ler siliniyor. Ana sayfalar + Tekrar (review) pratiği
zaten kapsıyor; aynı şeyi 5. bir biçimde göstermenin katkısı yok. Bu karar
T-011'i (nl/zh side quest backfill) geçersiz kılar → T-011 wontfix.

Kaldırılacak yüzeyler (grep: `side_quest|sideQuest|side-quest`):
- UI: `/quest` sayfası, RoadmapView'daki quest node'ları/girişleri
- Server: `/api/quests/[id]/start` route
- Core: `src/core/quest.ts`, curriculum-gen'deki quest üretimi,
  roadmap.ts'deki quest listeleme, llm-gen ilgili kısım
- LLM: `src/lib/llm/prompts/side-quest.ts`, schemas.ts'deki quest şemaları,
  curriculum prompt'undaki quest talimatları + fixture güncellemesi

**DB kararı — dikkat**: `nodes.side_quest_payload` kolonu ve quest tipli
`nodes` satırları schema'da kalabilir (ölü veri). Kolon DROP etmek
`SAVE_SCHEMA_VERSION` bump + eski save'lerin import reddi demek — sıfır
kazanç için maliyet. Öneri: schema'ya dokunma, sadece kod/UI/prompt kaldır;
mevcut quest node'ları roadmap sorgusunda filtrele. Schema temizliği
ileride başka bir zorunlu bump'a binerse yapılır.

Doğrulama: fixture modda yeni curriculum üret (quest'siz), mevcut DB'yle
roadmap/complete akışı çalışsın, `npm test` + parity harness
(`scripts/test-sqljs-parity.ts` — core değişiyor).
