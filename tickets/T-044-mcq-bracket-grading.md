---
id: T-044
title: mcq'da doğru şık "yanlış" sayılıyor (furigana bracket asimetrisi)
status: done
priority: p1
effort: S
confidence: high
depends: []
created: 2026-07-26
---
Ekran görüntüsüyle bildirildi: mcq'da doğru şık (姉) seçildiği halde
"Olmadı — Doğru cevap: 姉[あね]" dönüyordu.

Kök neden: şık da answer da DB'de bracket'lı ve **aynı** (`姉[あね]` —
schema `superRefine` zaten `options.includes(answer)` zorluyor, UI şıkkı
ham gönderiyor). `attemptExercise` (`src/core/lesson.ts`) `stripFurigana`'yı
yalnız beklenen tarafa uyguluyordu; `姉` vs `姉[あね]` eşleşmiyor. Tek
taraflı strip yazılı alıştırmalar (kullanıcı bracket yazamaz) için doğru,
makine-kopyası mcq cevabı için yanlıştı.

Fix (üç dokunuş):
- `src/core/lesson.ts`: `userResponse` da strip'leniyor — karşılaştırma
  simetrik. Yazılı tiplerde no-op; DB'deki mevcut bracket'lı sorular
  migrasyonsuz düzeldi.
- `src/components/lesson/LessonPlayer.tsx`: "Doğru cevap: …" feedback'i
  artık `<Furigana>` ile ruby render ediliyor (self-check yoluyla tutarlı).
- `src/lib/llm/prompts/lesson.ts`: çelişkili kural netleştirildi — "her
  kanjiye bracket" + "answer bracket'sız" + "answer şıkkın aynısı" üçlüsü
  kanji'li mcq'da aynı anda sağlanamıyordu. Artık bracket'sızlık yalnız
  yazılı tipler için; mcq'da answer şıkkın birebir kopyası.

Not: aynı session'da denenen tooltip okuma iyileştirmesi (JMdict kanji-run
okuması) yanlış okuma üretti (行く → gyou) ve tamamen geri alındı — o iş
bilinçli olarak yapılmayacak (bkz. T-030 reverted). Tooltip, bracket'sız
üretilmiş kanji için okuma göstermemeye devam eder.
