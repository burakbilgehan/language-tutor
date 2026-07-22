---
id: T-037
title: Vocab index eager bundle — her profil ~1.8 MB sözlük JSON'u yüklüyor
status: backlog
priority: p2
effort: M
confidence: high
depends: []
created: 2026-07-22
---
T-030 açtı. `src/lib/vocab-index/index.ts` hem zh-data.json (~692 KB) hem
ja-data.json (~1.1 MB) statik import ediyor. `vocabIndexFor` +
`buildSearchIndex` bu index'e ulaşıyor; `buildSearchIndex` global
`CommandPalette`'ten (layout.tsx, her sayfada mount) çağrılıyor. Sonuç: dil
ne olursa olsun (nl profili dahil, kelime sözlüğü olmayan diller) ilk boyada
~1.8 MB sözlük payload'u client'a gidiyor. grammar/kanji index'leri de aynı
kalıpta — sorun genel ama vocab en büyük iki dosya.

Önerilen yön: `buildSearchIndex(lang)` / `vocabIndexFor(lang)` içinde
dile-özel dinamik `import()` (lazy loader) — sadece aktif profilin dili
yüklenir. **CommandPalette sync→async imada**: `buildSearchIndex` şu an
`useMemo` ile senkron kuruluyor; lazy import onu async yapar → palette'in
index kurulumu Promise'e döner, "yükleniyor" durumu + ilk açılışta await
gerekir. Aynı lazy kalıp grammar/kanji index'lerine de uygulanabilir
(ayrı adım). Ölçüt: nl profilinde first-load JS'ten iki sözlük JSON'u düşsün.

Not: statik export (NEXT_PUBLIC_STATIC_BUILD) dinamik import'ları ayrı
chunk'lara böler mi doğrula — böler, ama palette'in await'i static modda da
çalışmalı.
