---
id: T-020
title: CJK tipografi — hanzi küçük ve font tutarsız
status: done
priority: p2
effort: S
confidence: medium
depends: []
created: 2026-07-18
---
Gözlem: Çince karakterler hem küçük kalıyor hem de "fontları sürekli
değişiyor" hissi var. Muhtemel neden: UI fontları (Fraunces/Nunito Sans)
CJK glifi içermiyor → tarayıcı sistem fallback'ine düşüyor; hangi fonta
düştüğü elemente/karaktere göre değişince tutarsız görünüyor. Ayrıca
`lang` attribute'u yoksa aynı kod noktası ja/zh varyantı arasında da
yanlış glif alabilir (Han unification).

Fix yönü:
- CJK için açık font stack'i tanımla: zh → `"Noto Sans SC", "PingFang SC",
  ...`, ja → `"Noto Sans JP", "Hiragino Sans", ...` (globals.css `@theme`
  token'ı olarak, ör. `--font-cjk-*`). Web font gömmek (Noto subset)
  ağır olabilir — önce sistem fontlarıyla tutarlılık dene, yetmezse
  next/font ile subset.
- CJK metin taşıyan bileşenlere (`Furigana`, vocab/kanji listeleri, örnek
  cümleler) `lang="zh-Hans"` / `lang="ja"` attribute'u — doğru glif
  varyantı için.
- Boyut: gövde CJK metnine Latin'den bir kademe büyük ölçek (karakter
  yoğunluğu yüksek, aynı px'te okunmaz) — ör. örnek cümleler ve
  liste başı karakterler için ortak utility class.

Doğrulama: ja + zh sayfalarını yan yana görsel kontrol (macOS + bir
Windows/Android cihazda fallback farkı büyük).
