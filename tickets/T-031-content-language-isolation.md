---
id: T-031
title: İçerik dil izolasyonu — en'e geçince Türkçe içerik görünmemeli
status: backlog
priority: p2
effort: M
confidence: medium
depends: []
created: 2026-07-22
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
