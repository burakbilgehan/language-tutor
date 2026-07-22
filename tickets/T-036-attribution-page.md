---
id: T-036
title: Atıf/lisans sayfası (EDRDG JMdict, Tanos JLPT, HSK, KanjiVG…)
status: done
priority: p2
effort: S
confidence: high
depends: []
created: 2026-07-22
---
T-030 açtı: JMdict tam dosyası artık ja kelime sözlüğünde kullanılıyor ve
EDRDG lisansı (CC BY-SA 4.0) **görünür atıf** şart koşuyor. Şu an atıf yalnız
kod başlıklarında (`src/lib/vocab-index/ja.ts`, `scripts/build-ja-vocab-index.mjs`,
`src/lib/jmdict/index.ts`) — kullanıcıya görünen atıf sayfası yok. Bu ticket o
sayfayı (ör. `/about` ya da Ayarlar altında "Kaynaklar & Lisanslar") toplu
olarak açar.

Listelenecek kaynaklar (hepsi hâlihazırda repoda kullanılıyor):
- **JMdict** — EDRDG, CC BY-SA 4.0 (https://www.edrdg.org/edrdg/licence.html).
  ja kelime sözlüğü okunuş+gloss kaynağı (tam dosya) + SelectionTooltip/kanji
  lookup alt kümesi. jmdict-simplified (scriptin/jmdict-simplified) üzerinden.
- **JLPT seviye listesi** — Jonathan Waller / tanos.co.uk, CC BY. ja kelime
  sözlüğü seviye kaynağı. Bluskyo/JLPT_Vocabulary makine-okunur dönüşümü (MIT
  araç, veri CC BY). NOT: Tanos listeleri 2010 4→5 seviye reformundan eski;
  bu "5 seviyeli" türev N3'ü interpole ediyor, modern resmi bölünmeyle
  birebir örtüşmeyebilir.
- **HSK 2.0 kelime listesi** — drkameleon/complete-hsk-vocabulary (MIT,
  gloss'lar CC-CEDICT türevi → CC BY-SA). zh kelime sözlüğü.
- Diğer mevcut kaynaklar da taransın (KanjiVG stroke verisi vb.) ve tek
  sayfada toplansın.

Çıkış: kullanıcıya görünen tek atıf/lisans sayfası + footer/settings linki.

---
Statü (2026-07-22, dalga 4.5): yapıldı — `/about` (Kaynaklar & Lisanslar) + Settings linki.
Kaynak listesi doğrulanarak çıkarıldı: JMdict/KANJIDIC2 (EDRDG CC BY-SA 4.0, kanji lookup +
SelectionTooltip hâlâ taşıyor), kanji-data (MIT araç), Tanos JLPT (CC BY, 2010 reform notuyla),
complete-hsk-vocabulary (MIT + CC-CEDICT gloss), hanzi-writer-data-jp (KanjiVG DEĞİL —
Make Me a Hanzi/animCJK türevi, LGPL/Arphic/Unicode) ve Hanzi Writer (MIT). KanjiVG repoda yok.
Açık soru KAPANDI (2026-07-22, Burak onayı): SelectionTooltip'e inline atıf
eklendi — ja modunda word/kanji sözlük verisi görünürken alt satırda
"JMdict/KANJIDIC2 © EDRDG" (zh yolu LLM çevirisi, atıf gerektirmez;
ayrıntı /about'ta).
