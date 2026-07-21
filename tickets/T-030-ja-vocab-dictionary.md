---
id: T-030
title: ja kelime sözlüğü (JMdict tabanlı, zh vocab kalıbının kopyası)
status: backlog
priority: p2
effort: L
confidence: medium
depends: [T-029]
created: 2026-07-22
---
Onay (Burak, 2026-07-22): faktüel katman veri setinden, LLM sadece
pedagoji. zh'de bu mimari çalışıyor (complete-hsk-vocabulary → index);
ja'da vocab sözlüğü hiç yok. Jisho scrape EDİLMEZ — Jisho zaten JMdict'in
arayüzü; dosyanın kendisi indirilir.

Elimizdekiler (baştan başlamıyoruz):
- `src/lib/jmdict/` — JMdict'in compact alt kümesi (common girişler,
  [word, reading, gloss] üçlüleri) zaten repoda, EDRDG CC BY-SA atıf notu
  başında. SelectionTooltip/kanji lookup bunu kullanıyor.
- `vocab_entries` tablosu targetLanguage kolonlu — şema hazır; UI nav
  gate'i `langs: ["zh"]`, ja eklenecek.
- Kanji index emsali: okunuş/gloss statik, LLM sadece Türkçe içerik —
  aynı sözleşme.

İş:
1. **Index distilasyonu**: `scripts/build-ja-vocab-index.mjs` →
   `src/lib/vocab-index/ja-data.json` (zh-data ile aynı şekil: word /
   reading(kana) / en[] / level). Gloss+okunuş kaynağı JMdict (tam dosya,
   repodaki alt küme değil). **Seviye kaynağı ayrı problem**: JLPT'nin
   2010 sonrası resmi kelime listesi yok — topluluk listesi gerekir
   (Tanos CC-BY ya da jlpt-word-list türevleri); lisansını ticket'a not
   düş. T-029'un çok-form dersi burada da geçerli (JMdict'te bir kelimenin
   birden çok yazımı/okunuşu olur — kayıpsız union, özel-isim önceliği).
2. **Core/UI genişlemesi**: `ensureVocabSeeded`/`core/vocab.ts` ja index'i
   tanısın (`vocabIndexFor` dispatch), nav gate'e ja, `/vocab?word=`
   ja'da açılsın. Arama: kana + romaji eşleşmesi (`jp.ts` wanakana
   yardımcıları — T-016 emsal).
3. **LLM yarısı**: `VocabContentSchema`'nın 量词 (classifier) alanı
   zh'ye özgü — ja dalında düşür ya da opsiyonel yap; örnekler furigana
   bracket notasyonuyla. Üretim yine user-triggered + packaged seed
   (`seed:vocab` zaten dil-parametreli).
4. **Atıf**: EDRDG şartı — atıf sayfası işi lisans ticket'ıyla birleşir;
   JMdict tam dosya kullanımı orada listelensin.

Doğrulama: "uma" / "馬" / "horse" üçü de aynı kelimeyi bulur; parity
harness ALL PASS; nav ja profilde Sözlük sekmesini gösterir, nl'de
göstermez.
