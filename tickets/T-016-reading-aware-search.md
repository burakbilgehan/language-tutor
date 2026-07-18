---
id: T-016
title: İdeogramlı dillerde okuma-farkında arama (hikari → 光, çoklu sonuç)
status: backlog
priority: p2
effort: M
confidence: medium
depends: []
created: 2026-07-18
---
Browser cmd+F ideogramlarda işe yaramıyor: "hikari" yazınca 光 bulunmalı.
Kanji/okunuş eşleşmesi çoğa-çok (aynı okunuş → birden çok kanji, aynı kanji
→ birden çok okunuş), o yüzden tek sonuç yetmez — sonuç listesi şart.

İki katman düşünülebilir, ticket ikisini de kapsar (ilki MVP):
1. **Global arama (MVP)**: header'a arama kutusu / cmd+K palette. Romaji veya
   kana girdisini wanakana ile katla (`src/lib/jp.ts` altyapısı hazır),
   kanji sözlüğü + vocab index + grammar index başlıklarında ara, sonuçları
   tip etiketiyle (kanji/kelime/gramer) listele, tıklayınca ilgili sayfaya
   (`/vocab?word=`, `/grammar?topic=`, kanji detayı) git. zh tarafında
   pinyin katlama `src/lib/zh.ts`'de mevcut (ton işareti/rakam/ü-v).
2. **Sayfa-içi bulma (opsiyonel ileri adım)**: cmd+F'i intercept edip
   sayfadaki CJK metinde okuma-eşleşmeli highlight. Riskli/pahalı; ancak
   MVP yetmezse.

Veri kaynakları hazır: ja kanji sözlüğü, zh `src/lib/vocab-index/zh-data.json`
(4991 kelime, pinyin+gloss), grammar index'ler. Yeni LLM çağrısı gerekmez —
tamamen deterministik, statik modda da çalışır.

Açık tasarım kararı: arama kapsamı (sadece sözlük/dizinler mi, ders içerikleri
de mi?). MVP: dizinler. Ders içeriği araması ayrı ticket olur.
