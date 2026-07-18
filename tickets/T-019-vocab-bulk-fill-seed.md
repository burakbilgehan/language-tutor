---
id: T-019
title: zh sözlük içeriğini toplu doldurma + paketlenmiş seed
status: todo
priority: p2
effort: M
confidence: high
depends: []
created: 2026-07-18
---
Sözlük (vocab) girişlerinin çoğu boş; dolu kelime örneği (的: örnekler +
eşdizimler + karakter analizi) beğenildi — hedef bütün HSK listesini bu
kaliteye getirmek. T-012'de bilerek ertelenen "packaged content seed"
işinin kendisi.

İçerik uniform mu sorusunun cevabı: evet — her kelime **bir kez** üretilir
(`VocabContentSchema`: meanings_tr + not + 量词 notu + örnekler +
eşdizimler + karakter kırılımı, zod-validated), DB'ye cache'lenir; LLM her
açılışta yeniden üretmez. Yapı şemayla sabit, dolayısıyla tüm kelimeler
aynı bölümlerle gelir.

İş iki parça (grammar'daki kalıbın birebir kopyası):
1. **Toplu üretim scripti**: ✅ YAPILDI (2026-07-18, backlog session'ında):
   `scripts/blast-generate.ts` vocab'ı da kapsayacak şekilde genişletildi
   (pending/error `vocab_entries` → `generateVocabContent`, position
   sıralı = HSK1→6). Kontrol paneli: `node scripts/blast-dashboard.mjs`
   → http://127.0.0.1:4646 (canlı izleme + dur/başlat/concurrency).
   Concurrency 8-16 bandında tut — 100 denendi, makine boğulup çağrılar
   120s timeout'a düştü. Kanji kuyruğu bitince vocab otomatik sıraya girer;
   sonraki kota penceresinde koşturulacak.
   Not: liste GET'i asla auto-queue yapmaz (T-012 kararı) — o kural duruyor.
2. **Packaged seed**: `npm run seed:vocab` — `data/app.db`'deki ready
   girişleri `public/vocab-seed/zh.json`'a export (grammar'daki
   `seed:grammar` kalıbı); `applyVocabSeed` (core) pending satırları
   seed'den doldurur, liste + deep-link'e iki modda da bağlanır. Böylece
   yeni profiller/statik kullanıcılar sıfır LLM çağrısıyla dolu sözlük alır.

Sıralama: 1 bitmeden 2'nin export'u eksik kalır ama altyapısı paralel
yazılabilir. Doğrulama: parity harness + statik build'de seed'den okuma.
