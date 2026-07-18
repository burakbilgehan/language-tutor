---
id: T-023
title: Haiku üretimi içerik kalite denetimi (halüsinasyon taraması)
status: parked
priority: p1
effort: S
confidence: high
depends: []
created: 2026-07-18
---
Tüm cheatsheet içeriği (kanji/grammar/vocab) haiku ile üretiliyor; uydurma
kelime / yanlış okunuş / saçma anlam şüphesi var. Opus'lu ayrı bir session
`data/app.db`'den rastgele 100 ready örnek çekip (≈60 kanji / 20 vocab /
20 grammar) statik referans kolonlarıyla (onyomi/kunyomi, pinyin,
meanings_en) çapraz kontrol edecek; kesin hatalıları `status='error'`
yapacak ki `scripts/blast-generate.ts` sonraki koşuda yeniden üretsin.
Tam prompt backlog session'ında verildi (2026-07-18); özü yukarıda —
"kesin hatalı" eşiği yüksek, emin olunmayan "şüpheli" olarak sadece
listelenir, UPDATE'ler blast dururken yapılır.

Sonuca bağlı karar (backlog session'ında konuşulacak): hata oranı yüksekse
(a) hatalıları haiku ile yeniden üretmek yerine `LLM_MODEL_FAST=sonnet`
ile blast koşturmak, (b) örneklemi büyütmek, (c) prompt'ları sıkılaştırmak.

Sıralama: blast'ın içerik koşuları bittikten SONRA koş (yarım içerikte
örneklem çarpık olur); `seed:grammar`/`seed:vocab` re-export'ları QA
temiz çıkınca yapılır — bozuk içeriği seed'e paketlememek için.

**parked (2026-07-18)**: Kanji+grammar ayağı koşuldu (rapor:
scratchpad-kanji-audit-report.md — 78 kanji'de 2 kesin hata, ikisi TR gloss;
okunuşlar/gramer temiz). Vocab üretimi bitince SADECE vocab örneklemiyle
tekrar koşulacak; sonra seed export'lar.
