---
id: T-075
title: Kapsama defteri — ders prompt'una ham soru listesi yerine deterministik özet
status: todo
priority: p1
effort: M
confidence: medium
depends: []
created: 2026-08-01
---

## Sorun

Ders prompt'u tekrar önlemek için öğrencinin önceki sorularını HAM METİN
olarak gömüyor (`recentExercisePrompts`, son 30) + tamamlanan ders adlarını
listeliyor (son 12). Tavanlar var, prompt sınırsız büyümüyor; ama yaklaşım
üç yerden sızdırıyor:

1. 30 soruluk pencere dolunca daha eski sorular dedupe dışına düşüyor,
   tekrar sorulabiliyor.
2. Ham soru metinleri (furigana parantezli) prompt'a gürültü basıyor ve
   modeli o kalıpları taklit etmeye itiyor.
3. "Neyi ne kadar öğrendi" bilgisini en kaba vekille (soru metni) taşıyor;
   öge/yön (tanıma-üretim) düzeyinde kapsama bilgisi yok.

## İş

Deterministik kapsama defteri: `exercises` + `attempts` (+ SRS kartları)
tablolarından KODLA çıkarılan kompakt özet — öge başına kaç kez, hangi
yönde (tanıma/üretim) sınandı, son skorlar. Ders prompt'una ham soru
listesi yerine bu özet girer ("şu ögeler zaten 2+ kez soruldu, yeni açı
bul: ..."). Sıfır LLM maliyeti, ölçek sınırsız, dedupe pencere değil tüm
geçmiş üzerinden.

- Çekirdek: `src/core/*` (env-agnostik, iki modda da aynı), struggles.ts'in
  yanına; `getStrugglesLine` ile birleşik tek "öğrenci bağlamı" bloğu
  düşünülebilir.
- `recentExercisePrompts` ham listesi kaldırılır (prompt sadeleşir).
- Ölçüm: aynı node için üretilen iki dersin soru tekrarı gözle
  karşılaştırılır; prompt token sayısı düşmeli.

## İlişki

T-071 (hızlı iskelet + arkadan alıştırmalar) ile tamamlayıcı: T-075 NEYİ
soracağını besler, T-071 NE ZAMAN üretileceğini böler. Müfredat üretiminde
tüm derslerin iskeletini önden çıkarma fikri bilinçli olarak REDDEDİLDİ:
müfredat üretimini şişirir ve iskeletler öğrencinin ilerleyişine
(struggles, feedback) kör kalıp bayatlar.
