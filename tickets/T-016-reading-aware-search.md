---
id: T-016
title: İdeogramlı dillerde okuma-farkında arama (hikari → 光, çoklu sonuç)
status: done
priority: p2
effort: M
confidence: medium
depends: []
created: 2026-07-18
closed: 2026-07-18
---
## Çözüm (MVP — katman 1)
Global cmd+K komut paleti. Katman 2 (sayfa-içi cmd+F intercept) yapılmadı;
gerekirse ayrı ticket.

- `src/lib/search-index.ts` — deterministik, okuma-farkında arama; statik
  kanji/vocab/grammar index'leri üstünde çalışır (LLM/DB/network yok, statik
  modda da çalışır). Okuma katlama: ja → `toRomajiReading` (kun işaretleri
  `.`/`-` soyulur), zh → `foldPinyin`; iki taraf da katlanıp substring eşleşir.
  Sonuç ~24 ile sınırlı, `buildSearchIndex` çağrı yerinde `useMemo` ile bir kez
  kurulur (~7500 giriş, keystroke başına katlama yok).
- `src/components/shared/CommandPalette.tsx` — `layout.tsx`'e SelectionTooltip
  yanına mount. cmd/ctrl-K toggle + header 🔍 butonu (`palette:open` custom
  event). Ok tuşu/Enter/Escape navigasyonu, tip+seviye etiketi.
- `/stroke?char=<kanji>` deep-link eklendi (StrokeTrainer `initialChar` prop,
  page Suspense-wrapped): kanji sonuçları tıklayınca yazım sayfasına gidip o
  kanjiyi açar (ayrı kanji detay route'u yok). vocab → `/vocab?word=`,
  grammar → `/grammar?topic=`.

Kapsam: sadece dizinler (MVP kararı). Ders içeriği araması yapılmadı — ayrı
ticket olur. E2E doğrulandı (ja profili): hikari→光 tıkla→/stroke, "fiil"→gramer
listesi, zh pinyin (pengyou→朋友) modül testinde doğrulandı.

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
