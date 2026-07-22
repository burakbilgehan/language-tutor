---
id: T-030
title: ja kelime sözlüğü (JMdict tabanlı, zh vocab kalıbının kopyası)
status: done
priority: p2
effort: L
confidence: medium
depends: [T-029]
created: 2026-07-22
closed: 2026-07-22
---
Kapanış notu (22 Tem 2026): uygulandı. Veri: JLPT seviyeleri Jonathan
Waller/tanos.co.uk (CC BY), Bluskyo/JLPT_Vocabulary dönüşümü üzerinden;
okunuş+gloss JMdict/EDRDG (CC BY-SA 4.0), scriptin/jmdict-simplified
(jmdict-eng) üzerinden. `scripts/build-ja-vocab-index.mjs` iki dosyayı
JMdict entry id'sinde join+dedup edip → `src/lib/vocab-index/ja-data.json`
(7584 kelime, N5→N1). Kavşak kapsamı %99.72 (8505 formdan 24'ü JMdict'te yok
— hepsi PDF dönüşüm çöpü, düşürüldü). T-029 çok-form dersi uygulandı: aynı
yüzeye çakışan farklı JMdict girdileri (入る=はいる/いる) tek satıra
birleştirilir — en kolay seviye (max Tanos = N5) + o okunuş baş, tüm
gloss'lar kayıpsız union; özel-isim sense'leri (n-pr/surname/place…) gloss
listesinin sonuna itilir. **v1 sınırı**: birleşen bir yüzeyin alternatif
okunuşları bağımsız aranamaz (生, 何 gibi çok-okunuşlular tek okunuşla
listede). Seviye kaynağı Tanos 2010-öncesi listeler — modern resmi
bölünmeyle birebir örtüşmeyebilir (N3 interpolasyonu).

Kod: `vocab-index/ja.ts` + `vocabIndexFor` ja dalı, `VocabIndexEntry.level`
N5–N1'e genişletildi (şema/save değişmedi — vocab_entries.level düz metin);
`search-index.ts` + `vocab-search.ts` okunuş katlama dile duyarlı (kana→romaji
`foldJaReading` / pinyin `foldPinyin`, satırın kendi scriptine göre dispatch);
nav gate `["zh","ja"]`; UI `lang` + seviye etiketleri (VocabSidebar/EntryView)
level prefix'inden (N*=ja) türetiliyor, EntryView `levelDisplay` kullanıyor;
`prompts/vocab.ts` 量词 satırı zh'ye özel, ja'da düşer, örnekler furigana
bracket. Doğrulama: "uma"/"馬"/"horse" üçü de 馬 buluyor (headless rankVocab
testi ALL PASS), parity ALL PASS, 58 unit test, `npm run build` OK, tsc temiz.
In-browser nav render'ı (ja gösterir/nl gizler) kodla doğrulandı, tarayıcıda
değil. Atıf **sayfası** T-036'ya devredildi (kod başlıklarında atıf var).
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
