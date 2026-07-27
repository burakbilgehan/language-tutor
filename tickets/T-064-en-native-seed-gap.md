---
id: T-064
title: en-native paketlenmiş seed boşluğu — LLM'siz "anında içerik" vaadi yalnız tr'de tam
status: backlog
priority: p3
effort: M
confidence: medium
depends: []
created: 2026-07-27
---
T-056 sırasında saptandı: `applyGrammarSeed` (ve kanji/vocab muadilleri)
**en-native profillerde bilerek no-op** (`nativeLanguage !== "tr" → return 0`,
T-031 dil izolasyonu — seed içeriği sahibin tr-native DB'sinden export edildiği
için Türkçe). Sonuç: en-native + LLM'siz kullanıcı index'i görüyor ama her konu
"Prepare" (LLM-gated) kalıyor; T-056'nın "statik içerik anında hazır" vaadi
bugün yalnız tr-native için tam. Hub bu durumu dürüstçe gösteriyor (bilinçli
kabul, T-056 ruling'i) — bu ticket boşluğun kendisini kapatır.

## Kapsam
- **Kod:** seed formatı zaten dil-slotlu (`lang-content.ts` tr/en merge).
  Export script'leri en slot'unu da taşıyacak şekilde genişletilmeli;
  `apply*Seed`'lerin tr-only gate'i "profilin native dilinde slot varsa uygula"
  olmalı (mergeLangContent zaten diğer slotu korur).
- **Ops (ticket'ın parçası DEĞİL, önkoşulu):** en içerik üretimi — sahibin
  DB'sinde en-native profillerle blast koşusu gerçek LLM maliyeti ister.
  İçerik üretimi ops kuralı gereği panel üzerinden yürür; bu ticket üretim
  bitmeden implement edilirse seed dosyaları kısmi en slot'uyla gider (vocab
  1400/4991 emsali — kabul edilebilir).

## Karar noktası
en kütüphanesinin tamamı mı (grammar 554 + kanji + vocab) yoksa öncelikli bir
alt küme mi (ör. yalnız grammar) üretilecek — maliyet Burak kararı.
