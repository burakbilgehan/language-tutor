---
id: T-014
title: Statik modda navigasyonlar basePath kaybediyor (import + dil değiştirme sonrası /map'e düşüş)
status: done
priority: p1
effort: S
confidence: high
depends: []
created: 2026-07-18
---
Canlıda gözlendi: save import sonrası ve dil (profil) değiştirince tarayıcı
`https://burakbilgehan.github.io/map` adresine gidiyor — basePath
(`/language-tutor`) düşüyor, kullanıcı siteden atılmış oluyor.

Kök neden doğrulandı: hard navigasyonlar `withBase()` kullanmıyor —
- `src/app/settings/page.tsx:131` → `window.location.href = "/map"` (import sonrası)
- `src/components/settings/ProfileSection.tsx:177` → `window.location.href = "/map"` (profil switch)

Next `router.push` basePath'i otomatik ekler ama `window.location` eklemez;
bu akışlar full reload istediği için bilerek `window.location` kullanıyor
(use-profile-meta cache varsayımı, bkz T-013).

Fix: bu iki noktayı (ve grep'le bulunacak benzerlerini) `withBase("/map")`
(`src/lib/base-path.ts`) üzerinden geçir. `client-api.ts:502`'deki
`/api/save/export` de aynı sınıfta — statik modda zaten farklı yol
izleniyorsa dokunma, değilse onu da düzelt. Doğrulama: `npm run build:static`
+ Pages'te (veya `npx serve out` ile base path simüle ederek) import ve dil
değiştirme akışını uçtan uca dene.

Not: T-013 (bayat nav) ile aynı bölgede — birlikte implement edilebilir ama
bağımsız da yapılabilir.

Fix: iki nokta `withBase("/map")`'e çevrildi. `client-api.ts:502`
(`/api/save/export`) dokunulmadı — `!IS_STATIC` dalında, sunucu modunda
basePath yok. `client-api.ts:502` altındaki statik-mod dalı zaten farklı
(blob indirme) yol izliyor. `npm run build:static` temiz; `npx serve out`
ile gerçek Pages alt-path davranışı simüle edilemedi (serve kökten servis
ediyor) — kod seviyesinde grep + typecheck + build ile doğrulandı, gerçek
Pages ortamında deploy sonrası elle teyit önerilir.
