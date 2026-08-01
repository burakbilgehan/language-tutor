---
id: T-071
title: Ders üretimini böl — hızlı iskelet + arkadan tamamlanan egzersizler (lazy load)
status: todo
priority: p1
effort: L
confidence: medium
depends: []
created: 2026-08-01
---

## Sorun

Tek Sonnet çağrısı tüm dersi (anlatım + örnekler + 10+ egzersiz + kabul
varyantları, 6-9k karakter) tek seferde üretiyor: 90-190s, kuyrukta 180s+
kuyruklu vakalar. Kullanıcı algısı (2026-08-01, Burak): "187 saniyede biten
ders gayet küçük içerik; 3+ dk beklemek anlamsız." Prefetch bu süreyi
gizliyor ama ilk açılışta ve pencere boşken çıplak yaşanıyor.

## Onaylı yön (Burak, 2026-08-01)

İki aşamalı üretim; HEM kullanıcı açılışında HEM prefetch'te aynı bölünme:

1. **İskelet çağrısı** (hızlı, hedef 30-40s): ders başlığı/anlatım/örnekler
   + ilk ~3 egzersiz. Bu döndüğü an ders AÇILIR; kullanıcı çalışmaya başlar.
2. **Tamamlama çağrısı** (arkada): kalan egzersizler + kabul varyantları.
   Bittiğinde derse eklenir; kullanıcı 3. egzersizi bitirmeden hazırsa
   dikişsiz, değilse egzersiz listesi sonunda "hazırlanıyor" placeholder'ı.

Prefetch'te de iki parça sırayla üretilir (iskelet önce: pencere iki dersin
İSKELETİNİ, sonra tamamlamalarını çeksin — en kötü durumda bile sıradaki
ders "açılabilir" durumda olur).

## Tasarım soruları (implementasyondan önce karara bağla)

- İçerik şeması: `LessonContent`'e kısmi durum eklemek SAVE_SCHEMA_VERSION
  bump'ı GEREKTİRMEMELİ. Aday: content map'inde `exercises` + opsiyonel
  `pendingExercises: true` bayrağı (zod'da optional alan = eski kayıtlar
  geçerli kalır); tamamlama çağrısı bayrağı düşürür.
- İki çağrı = iki prompt: tamamlama çağrısı iskeletin egzersizlerini görmeli
  (tekrar/çakışma olmasın), ama tüm anlatımı yeniden üretMEmeli.
- Kesinti: iskelet var + tamamlama öldü → ders açılır, egzersiz listesi
  sonunda retry butonu (T-070 error yüzeyi deseni). Pencere invariant'ı
  "iskeleti olan ders" ile "tam ders"i ayırt etmeli mi? (öneri: hedef listesi
  önce iskeletsizler, sonra tamamlanmamışlar.)
- Maliyet: çağrı sayısı 2x ama toplam token benzer; kuyruk baskısı için
  tamamlama çağrıları her zaman urgent'sız.

## Kapsam dışı

- Streaming/SSE (zod bütün-doğrulama modeliyle uyumsuz; bu ticket çağrı
  bölme ile çözüyor).
- Grammar/kanji/vocab üretimleri (zaten küçük ve tek parça).
