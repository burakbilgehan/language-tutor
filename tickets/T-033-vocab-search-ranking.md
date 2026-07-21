---
id: T-033
title: Sözlük araması — ranking yok, "ma" alakasız sonuç kusuyor
status: backlog
priority: p1
effort: S
confidence: high
depends: []
created: 2026-07-22
---
Semptom (Burak, canlı screenshot): sözlükte "ma" yazınca 了/是/你/和/好/
小/做 gibi alakasız sonuçlar dönüyor; 马/妈/吗 üstte değil.

Neden: `VocabSidebar` filtresi düz substring — `fold(reading).includes(q)`
+ `meaningsEn.some(m => fold(m).includes(q))`. "ma" → "many", "small",
"make", "marker", "(coll.) what?" gibi gloss'ların İÇİNDE geçiyor. T-029
union'ı anlam listelerini bilinçli büyüttü; arama katmanı buna göre
düzeltilmeden gürültü arttı (T-029'un eksik bırakılan yarısı).

Fix — skor katmanlı ranking + eşik, filtre değil sıralama problemi:
1. Katmanlar (yüksekten düşüğe):
   a. Kelime CJK eşleşmesi (query hanzi içeriyorsa exact > prefix >
      substring).
   b. Okunuş TAM hece eşleşmesi, toneless fold ("ma" == mǎ/má/mā/ma).
   c. Okunuş prefix ("ma" → mǎshàng; "mashang" → 马上).
   d. Gloss kelime-sınırı eşleşmesi (\b ile; "horse" tam kelime olarak).
   e. Gloss substring — sadece query ≥3 harfse ve üstteki katmanlar
      boşsa; "ma" gibi kısa query'lerde hiç girmesin.
2. Katman içi sıralama: seviye (HSK1 önce) + position (frequency zaten
   position'a gömülü).
3. cmd+K palette'in reading-aware mantığıyla (T-016, `search-index.ts`)
   tutarlılık — ortak yardımcı çıkarılabilirse çıkar, kopya kural olmasın.
4. Ayrı küçük parça: 吗'nın birincil formu má "(coll.) what?" görünüyor —
   build script tie-break'i eşitlikte dataset sırasını alıyor. Nötr tonlu
   (işaretsiz pinyinli) form particle'larda kazanmalı (吗→ma, 得→de gibi).
   `build-vocab-index.mjs`'e tie-break + index re-export; değişen
   birincil okunuşları diff'te gözden geçir (davranış değişikliği).

Doğrulama: "ma" → 妈/马/吗 ilk üçte, 小/那/做/了 listede YOK; "horse" →
马 üstte; "mashang" → 马上; hanzi yapıştırma (马) exact üstte; parity
harness ALL PASS (core'a dokunulursa).
