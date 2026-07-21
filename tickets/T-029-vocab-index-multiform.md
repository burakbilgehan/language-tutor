---
id: T-029
title: Vocab index çok-formlu girdiler — 马 "surname Ma" / "horse" bulunamıyor
status: done
priority: p2
effort: S
confidence: high
depends: []
created: 2026-07-22
---
✅ Kapatıldı (2026-07-22, backlog session'ında implement edildi). Uygulanan
kural: birincil form = özel-isim-olmayan (pinyin'i büyük harfle başlamayan)
formlar içinden EN ÇOK gloss'u olan (骑'de tek gloss'lu jì'yi değil qí'yı
seçmek için "ilk form" yerine "en zengin form"); tüm formların gloss'ları
kayıpsız union (MAX_GLOSSES kaldırıldı), classifiers da union. Doğrulama:
马→"mǎ | horse ... surname Ma" (surname aranabilir), 骑→qí, 地/得/还/行
tüm okunuş anlamları listede; "horse" araması 马/马上/骑/乘/匹 döndürür.
4991 giriş, seviye dağılımı değişmedi. Mevcut profillere yayılım:
ensureVocabSeeded diff-sync zaten reading/meaningsEn/classifiers alanlarını
güncelliyor, ek iş gerekmedi.

Kök neden (2026-07-22): `scripts/build-vocab-index.mjs` çok formlu
girdilerde "gloss'u olan İLK formu" alıyor. 马'nın ilk formu Mǎ (soyadı),
ikincisi mǎ (at) — index'e sadece "surname Ma" giriyor. Sonuç: listede
saçma görünüm + İngilizce "horse" araması 马'yı bulamıyor. LLM hatası
değil, distilasyon hatası.

Karar (Burak): birleştirme kayıplı (downsample) OLMASIN. Kural:
1. **Birincil form** = özel-isim-olmayan form (gloss'ları proper-noun
   kalıbında olmayan; "surname X" / baş harfi büyük tek gloss vb.).
   Görünen okunuş + ilk gloss ondan gelir (mǎ, "horse").
2. **Bütün formların gloss'ları union'lanır** — `en` listesi hiçbir anlamı
   atmaz; soyadı anlamı da listede kalır, sadece başa geçmez.
   `MAX_GLOSSES=4` kesmesi bu hedefle çelişiyor — kaldır ya da form başına
   uygula; SKIP_GLOSS çöp filtresi ("variant of" vb.) kalsın.
3. Arama zaten `meaningsEn.some(includes)` — union sayesinde hangi anlam
   aranırsa aransın kelime çıkar ("horse" da "surname" da 马'yı bulur).

İş: script fix → `node scripts/build-vocab-index.mjs` ile
`src/lib/vocab-index/zh-data.json` yeniden üret → commit. Statik yarı
`ensureVocabSeeded` diff-sync'i mevcut profillere yeni gloss'ları taşıyor
mu doğrula (taşımıyorsa sync alanlarına `en`/`reading` ekle).

Doğrulama: 马 listede "mǎ / horse" görünür; "horse" ve "surname" aramaları
ikisi de 马'yı döndürür; parity harness ALL PASS; birkaç başka çok-formlu
girdi (地, 得, 还 gibi çok okunuşlular) göz kontrolü.
