---
id: T-012
title: zh kelime sözlüğü (HSK vocab cheatsheet)
status: done
priority: p2
effort: M
confidence: high
depends: []
created: 2026-07-18
---
Çince için seviye-bazlı sözlük. ja'daki kanji bölümünün zh karşılığı DEĞİL:
Çince'de çalışma birimi kelime (词), karakter değil — HSK zaten seviye başına
kelime listesi tanımlar (HSK 1-6, kümülatif ~5000). Karakter/stroke tarafı
T-005'te ayrı kalır (CEDICT + stroke trainer); bu ticket kelime yüzeyi.

Kararlar (18 Tem 2026, konuşmadan):
- Kapsam v1: sadece zh. Şema/UI dil-agnostik (vocab_entries.target_language),
  index sadece zh bundle'lanır; ja (JLPT) / nl (CEFR) sonraki ticket.
- SRS entegrasyonu v1'de YOK — salt-okunur cheatsheet (grammar gibi).
  "Desteye ekle" sonraki iterasyon.
- Kalıp: grammar/kanji cheatsheet kalıbı. Statik deterministik index
  (`src/lib/vocab-index/zh.ts|json`: kelime + pinyin + İng. gloss + HSK
  seviyesi + pozisyon) → incremental diff-seed (`ensureSeeded` kontratı:
  eksik ekle, statik alanları re-sync et, content/status'a dokunma) →
  giriş içeriği LLM ile on-demand üretilir, cache'lenir.
- LLM zenginleştirme içeriği (zod, schemas.ts): ana dilde açıklama, örnek
  cümleler (pinyin bracket notasyonu `学生[xuésheng]`), eşdizimler,
  isimler için ölçü kelimesi (量词), karakter kırılımı (radikal/fonetik
  bileşen ipucu). Ölçü kelimesi zh'ye özgü zorunlu alan.
- Veri kaynağı: açık HSK 2.0 JSON listesi vendor'lanır (jmdict emsali;
  gloss'lar CEDICT türevi ise CC-BY-SA atıf notu dosya başına).
- Yeni tablo `vocab_entries` (kanjiEntries kalıbı, ama okunuş kolonu tek ve
  jenerik `reading`) → SAVE_SCHEMA_VERSION bump.
- Seam: iş mantığı `src/core/vocab.ts` (AppDb + Gen), route'lar ince kabuk,
  client-api.ts IS_STATIC dalı, static modda inline üretim.
- UI: `/vocab` (seviye grupları + arama, sadece zh profilde nav'da görünür),
  detay `/vocab?word=` query-param (statik export kuralı, Suspense).

v1 dışı (bilerek): packaged content seed (`public/vocab-seed/`) — owner
içerik ürettikten sonra grammar-seed kalıbıyla eklenir.

Kapanış notu (18 Tem 2026): uygulandı. Veri: drkameleon/complete-hsk-vocabulary
(MIT) → `scripts/build-vocab-index.mjs` → `src/lib/vocab-index/zh-data.json`
(4991 kelime, old-HSK 1-6). `vocab_entries` + SAVE_SCHEMA_VERSION 6,
`src/core/vocab.ts`, `generateVocabContent` (fast tier), `/api/vocab*`
(liste GET LLM tetiklemez — kanji'nin aksine bilinçli), client-api seam,
`/vocab?word=` UI (grammar dörtlüsü klonu; kapalı seviye grupları render
edilmez, arama diacritic-insensitive, CAP 100). Nav `langs:["zh"]`.
Ek: browser.ts DDL replay (try/catch) — eski IndexedDB imajları yeni
tabloyu kendiliğinden alır. Doğrulama: tsc, 56 unit test, parity ALL PASS
(listVocab/findVocab/generateVocabContent dahil), fixture dev smoke
(liste→üret→ready), build:static OK.
