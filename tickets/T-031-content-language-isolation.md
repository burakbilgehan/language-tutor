---
id: T-031
title: İçerik dil izolasyonu — en'e geçince Türkçe içerik görünmemeli
status: done
priority: p2
effort: M
confidence: medium
depends: []
created: 2026-07-22
closed: 2026-07-22
---
## Kapanış (2026-07-22)
Branch `t-031-content-language-isolation`, 3 commit. Plan: `T-031-PLAN.md`.

**Layer 2 (içerik):** JSON içerikli 4 yüzey (lesson/grammar/kanji/vocab)
dil-anahtarlı map `{tr,en}` — yerinde üretim ÜZERİNE yazmaz, MERGE eder →
tr↔en↔tr geçişinde eski içerik aynen döner (fable-verifier CONFIRMED, 14
assertion). Egzersizler yan-tablo olduğu için `exercises.lang` kolonu eklendi
(gövde map, egzersizler dil-scoped delete/insert; diğer dilin attempt'leri
korunur). İş kuyrukları (ensureLessonJob/queueMissingLessons/queueKanjiLevel/
batch route'lar) mevcut-dilde-hazır olmayan satırları kuyruklar. Paketli
seed'ler tr → `applyX` seed `nativeLanguage==="tr"` gate'li, `{tr:...}` damgalı.
translations cache key'ine native_language eklendi (pre-existing tr/en çakışma
bug'ını da kapattı). Müfredat başlıkları düz kolon: `curricula.content_lang`
damgası + roadmap payload'ında yanlış-dil başlıkları SUNUCUDA null'lanır +
yerinde "bu dile çevir" (ilerleme/SRS korunur). Settings dil değişiminde
maliyet uyarısı. Kısmi çeviri reddedilir (leak guard).

**Layer 1 (hardcoded tr):** JSX temizdi; sızıntı hata string'lerindeydi. Stable
error-code contract (`src/lib/errors.ts` + `i18n/errors.ts` + `useLocalizeError`)
— route'lar `{error: code}` döner, UI sınırında lokalize edilir, bilinmeyen kod
generic'e düşer (ham tr asla render olmaz). 27 route + client-api + 18 catch
site + SaveImportError.

**Şema:** SAVE_SCHEMA_VERSION 6→7 (translations.native_language,
curricula.content_lang, exercises.lang) + browser ADD COLUMN self-heal + DDL
regen. Doğrulama: tsc temiz, 58 test, sql.js parite harness yeşil, fixture build.

**Bilinçli kapsam dışı (aynı sınıf, ayrı ticket'a değer — Burak kararı):**
- `srs_cards.back`: native metin, dil damgası yok; dedupe `(profileId,
  itemType, front)` üzerinde. tr'de kart biriktirip en'e geçen kullanıcı
  /review'da Türkçe arka yüz görür (`onConflictDoNothing` üzerine yazmaz).
- `chat_messages.content`: geçmiş hoca mesajları üretildiği dilde kalır.
Bunlar ticket'ın sıralı kapsamında değildi; damga eklemek SRS/chat şema
değişikliği ister. Takip ticket'ına aday.

overview.ts kontrol edildi: sadece agregat + seviye etiketi (levelDisplay,
dil-nötr) döner — başlık sızıntısı YOK.
---
Semptom (Burak, canlı): dili İngilizce yapınca hâlâ Türkçe şeyler
görünüyor. İki ayrı katman var, ikisi de ele alınmalı:

1. **Hardcoded Türkçe** (S tablosu dışında kalanlar): ör. `client-api.ts`
   hata mesajları ("Profil yok", "Müfredat hazır değil"), route hataları,
   muhtemel başka kaçaklar. Sweep: repo genelinde string literal Türkçe
   taraması → hepsi co-located S tablosuna ya da server `pick()`'e.

2. **Cache'lenmiş LLM içeriği**: `_tr` alanları "öğrencinin ana dilinde"
   demek; içerik üretildiği andaki nativeLanguage ile yazılıyor ama
   ÜZERİNE DİL DAMGASI YOK. nativeLanguage tr→en değişince eski Türkçe
   içerik aynen servis ediliyor. Karar (Burak): üretilmiş içerik dil
   koduyla damgalansın; dil değişince o dilde kaynak YOKMUŞ gibi
   davranılsın (pending'e düş / yeniden üret).

Tasarım notları (implement'te netleşecek):
- Damga yeri: ayrı kolon = şema değişikliği = SAVE_SCHEMA_VERSION bump.
  Alternatif: içerik JSON'unun içine `lang` alanı (json kolonlar esnek,
  şema bump'sız). Damgasız eski satırlar = "tr" varsay (tr default'tu).
  Hangisi seçilirse zod şemalarına (schemas.ts) işlenmeli.
- Kapsam: lesson içerikleri, grammar_topics.content, kanji_entries
  (Türkçe anlam/örnekler), vocab_entries content, translations cache,
  curriculum başlık/açıklamaları (units.titleTr vb. — bunlar json değil
  kolon; en zor vaka, belki sadece "yeniden üret" butonu).
- **Packaged seed'ler Türkçe**: grammar/kanji/vocab seed JSON'ları tr
  içerik taşıyor. Seed dosyaları da dil damgalı olmalı ve en-native
  profile UYGULANMAMALI (yoksa "İngilizce profilde Türkçe içerik"
  hatası seed yolundan geri gelir). en kullanıcı içeriği LLM'den üretir.
- UX: nativeLanguage değişimi Settings'te — değişim anında kullanıcıya
  maliyet uyarısı ("cache'li içerik bu dilde yok, yeniden üretilecek").
  İçerik silinmez — tr'ye dönünce eski içerik geri görünür (damga
  eşleşince).

Doğrulama: tr profille üretilmiş grammar/kanji/lesson → nativeLanguage
en yap → içerik "hazırlanmadı" durumuna düşer, LLM ile en üretilir; tr'ye
geri dön → eski Türkçe içerik aynen geri gelir; seed'ler en profile
uygulanmaz.
