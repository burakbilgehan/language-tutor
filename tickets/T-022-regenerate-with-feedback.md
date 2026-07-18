---
id: T-022
title: Ders yeniden üretme butonuna feedback text box'ı
status: done
priority: p2
effort: S
confidence: high
depends: []
created: 2026-07-18
---
Daha önce istenmişti, es geçilmiş — bu yüzden todo. Ders "yeniden üret"
akışı şu an körlemesine yeniden generate ediyor; aynı hatayı tekrar üretme
riski var. Butona bir text box eklenecek: kullanıcı neyin yanlış/eksik
olduğunu yazar ("örnekler çok kolay", "romaji hatalı" vb.), bu metin
regenerate prompt'una "önceki üretimdeki sorunlar — bunları düzelt"
bölümü olarak eklenir.

Uygulama:
- UI: regenerate butonu → küçük form (textarea, opsiyonel değil zorunlu
  yapılabilir; boşsa eski davranış). Lesson sayfasında; aynı kalıp
  grammar topic regenerate'ine de uygulanabilir (varsa).
- Prompt: lesson prompt'una opsiyonel `regenerationFeedback` parametresi;
  `nativeLanguageName()` kuralına uy (hardcode Türkçe yok). Kullanıcı
  metni prompt'a data olarak girer (injection kaygısı düşük — kullanıcının
  kendi LLM'i/oturumu).
- Akış iki modda da (server route + statik core) çalışmalı —
  `src/core/lesson.ts` regenerate yoluna parametre ekle, route/client-api
  ince kabuk kalsın (CLAUDE.md seam kuralı).
- Eski ders içeriği prompt'a "önceki üretim" olarak kısaca dahil edilirse
  LLM neyi düzelttiğini görür — token maliyetiyle tartılmalı, özet yeter.

Doğrulama: fixture modda parametrenin prompt'a girdiğini assert eden
birim test veya log kontrolü; gerçek LLM'le bir kez uçtan uca.
