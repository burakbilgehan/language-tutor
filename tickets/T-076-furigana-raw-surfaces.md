---
id: T-076
title: Soru metni (promptTr) furigana render'ından geçmiyor — ham parantez görünüyor
status: todo
priority: p2
effort: S
confidence: high
depends: []
created: 2026-08-01
---

## Sorun

Köşeli parantez notasyonu (漢字[かんじ]) TEL formatı; UI'da `Furigana`
bileşeni ruby olarak kanjinin üstüne basıyor. Tasarım doğru (hizalama
problemi: ayrı okunuş alanı istemcide morfolojik analiz gerektirirdi;
Anki'nin de kullandığı yaklaşım). AMA `LessonPlayer.tsx:692` soru metnini
(`exercise.promptTr`) Furigana'dan geçirmeden HAM basıyor: içinde Japonca
parça olan sorularda (「母」の 読[よ]み方[かた]は...) kullanıcı parantezleri
ekranda görüyor (2026-08-01 şikayeti).

## İş

1. `promptTr`'yi `Furigana` render'ından geçir (cjkLang zaten bileşende
   mevcut; hedef dil ja/zh değilse Furigana no-op olmalı).
2. Tek turlu audit: LLM'den gelen ve parantez içerebilecek metin basan TÜM
   yüzeyler (SrsSession kart yüzleri, review practice, chat, selfCheck,
   fill_blank boşluklu cümle, feedback) Furigana'dan geçiyor mu?
   Geçmeyenler listelenip aynı PR'da düzeltilir.
3. Grading tarafına dokunulmaz: answers.ts'in simetrik bracket strip'i
   (T-044) davranışı değişmemeli.
