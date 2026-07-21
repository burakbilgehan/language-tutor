---
id: T-025
title: Onboarding'e "Kayıt yükle / Yeni başla" giriş ekranı
status: backlog
priority: p2
effort: M
confidence: high
depends: []
created: 2026-07-22
---
Save import şu an sadece Settings'te. Kayıtlı bir save'i olan kullanıcı
boş session açınca önce wizard'ın bütün sorularını cevaplıyor, LLM
bağlantısı yoksa uzun süre bekliyor — sonra import'u bulup her şeyi eziyor.
Oyunlardaki gibi olmalı: boş session'ın İLK ekranı iki kart:

- **Kayıt yükle (Load)**: dosya seçici → mevcut import akışı (replace-all,
  version check). Başarılıysa wizard komple atlanır, /map'e düş.
- **Yeni başla (New game)**: mevcut wizard step 0'dan devam.

Notlar:
- İki modda da çalışmalı (server `/api/save/import`, statik tarayıcı image
  replace) — Settings'teki akışın aynısını çağır, kod kopyalama.
- Ekran copy'si onboarding gibi `pick(S, draft.uiLanguage)` ile — henüz
  profil yok.
- "Boş session" tespiti: hiç profil yoksa. Profil varken bu ekran
  görünmez.
- T-024 ile birlikte düşün: import edilen save job kuyruğu taşımamalı.

Doğrulama: temiz profil (statik modda temiz IndexedDB) → ilk açılışta
Load/New ekranı; save yükle → wizard'sız haritaya; Yeni başla → mevcut
wizard aynen.
