---
id: T-013
title: Yeni dil ekleyince header/nav eski profilde kalıyor
status: backlog
priority: p3
effort: S
confidence: high
depends: []
created: 2026-07-18
---
Canlıda (statik mod) gözlendi: Settings → yeni dil (zh) eklenince nav
sekmeleri (Sözlük, Pinyin) refresh atılana kadar gelmiyor; refresh sonrası
her şey normal.

Kök neden bilinen: `src/lib/use-profile-meta.ts` profil metasını
module-level cache'liyor ve "aktif profil değişimi her zaman full page
reload'la olur" varsayımına yaslanıyor (dosyadaki yorum). Yeni dil ekleme /
onboarding dönüşü akışı reload'sız navigate edince cache bayat kalıyor.

Fix yönü: profil oluşturma/switch sonrası cache'i invalidate et (module
cache'i sıfırlayan bir `invalidateProfileMeta()` export'u + ilgili akışların
çağırması) YA DA switch akışındaki `window.location` kalıbını yeni-dil
akışına da uygula. İkincisi daha ucuz ve mevcut varsayımı korur.
