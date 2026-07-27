---
id: T-055
title: Sky kalıntıları — T-053 fence'i dışında kalan küçük dokunuşlar
status: backlog
priority: p3
effort: S
confidence: high
depends: [T-053]
created: 2026-07-27
---
T-053 uygulanırken fence gereği dokunulmayan, mock'un gösterdiği veya kural
setinin gerektirdiği küçük kalıntılar (T-053 agent raporundan):

1. **StatsHeader arama pill'i** — mock'ta sky tint alıyor; dosya T-052'nin
   fence'indeydi, T-053 dokunmadı. Tek class değişikliği.
2. **BackupBar "Yedekle" butonu** — layout seviyesinde global chrome, her
   sayfada terracotta; sayfa başına tek-baskın-terracotta kuralıyla yarışıyor.
   `bg-accent` → `bg-sky` (veya CozyButton `info`) yeterli.
3. **Kapsam dışı ekranların focus stilleri** — chat/vocab/conjugate input'ları
   hâlâ `focus:border-accent`; sky focus kuralı (1.5px `--sky` border + 4px
   `rgb(79 147 176 / .15)` ring — pratikte 2px border + `ring-sky/15`,
   T-053'teki gibi) bu ekranlara da yayılmalı.

Kural referansı: `design/okumo-sky/README.md` "Color usage rules".
Doğrulama: dark/light iki temada göz kontrolü + `npm run build:static`.
