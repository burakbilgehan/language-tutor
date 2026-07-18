---
id: T-019
title: zh sözlük içeriğini toplu doldurma + paketlenmiş seed
status: done
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
2. **Packaged seed**: ✅ YAPILDI (2026-07-18). `npm run seed:vocab`
   (`scripts/export-vocab-seed.ts`, grammar'daki `export-grammar-seed.ts`
   kalıbının birebir kopyası) — `data/app.db`'deki ready girişleri
   `public/vocab-seed/<lang>.json`'a export. `applyVocabSeed` (core/vocab.ts,
   grammar'daki `applyGrammarSeed`'in aynısı, word-keyed) pending/error
   satırları seed'den doldurur. Bağlandığı yerler (grammar ile birebir):
   server `/api/vocab` GET liste (dosyayı process-ömrü boyunca cache'ler);
   statik mod `client-api.ts` `vocabList` + `vocabDetail` (tarayıcıdan
   `src/lib/vocab-seed.ts` `fetchVocabSeed` ile indirir, dil başına promise
   cache). Server `/api/vocab/[word]` deep-link route'u grammar'ın
   `[slug]`'ı gibi seed'e dokunmuyor (kasıtlı — pattern öyle, sadece liste
   GET'i ve statik client-api uyguluyor).

   Doğrulama: `npx tsc --noEmit` temiz, parity harness ALL PASS
   (`listVocab (zh seed) → 4991 kelime` dahil), `npm run seed:vocab` gerçek
   DB'den 2 hazır kelimeyi export etti (kalanı blast arka planda dolduruyor),
   `applyVocabSeed` geçici DB kopyasında pending→ready dolum manuel
   doğrulandı (bkz. session notu — filled:1, hasContent:true).

Not: committed `public/vocab-seed/zh.json` şu an sadece 2 kelime (blast
kuyruğu bitmedi) — INDEX.md ops adımı 3'te ("seed:grammar + seed:vocab
re-export → commit → Pages deploy") tam kütüphaneyle re-export planlı,
bu bilinçli bir eksik, unutulmuş değil.
