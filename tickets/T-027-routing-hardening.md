---
id: T-027
title: Routing hardening — dil değişimi hataları + .txt'ye düşen linkler
status: backlog
priority: p1
effort: M
confidence: medium
depends: []
created: 2026-07-22
---
Semptomlar (canlı = GitHub Pages statik build):
1. Canlıda dil değiştirince routing hatası (T-013/T-014 ailesinin devamı —
   ikisi de "done" ama semptom sürüyor, demek ki süpürme eksik kaldı).
2. Tıklanan sayfalar ara ara `grammar.txt` gibi adreslere gidiyor. Teşhis:
   Next static export her route için RSC payload'ını `.txt` dosyası olarak
   üretir; Link normalde bunu arka planda fetch'ler, prefetch/basePath bir
   yerde ıskalayınca tarayıcı `.txt`'ye DÜZ NAVİGASYON yapıyor.

Somut yakalanmış örnek (2026-07-22): `RoadmapView.tsx` `openLesson` —
`window.history.pushState(null, "", "/map?lesson=...")` basePath'siz;
Pages'te URL'yi `/language-tutor/map`ten köke (`/map`) yeniden yazıyor.
Sonraki navigasyon/refresh bundan kırılır. Muhtemelen tek örnek değil.

İş — semptom kovalamak yerine tek süpürme:
1. Repo genelinde `history.pushState/replaceState`, `router.push/replace`,
   `<Link href>`, `window.location` kullanımlarını çıkar; hepsinin statik
   modda basePath-doğru olduğunu denetle (`withBase` ya da Next'in
   basePath-farkında API'ları). Kural olarak yaz: raw history API'sine
   çıplak path verilmez.
2. Dil/profil değişimi sonrası navigasyon standardı: hangi geçişler tam
   reload, hangileri client nav — tek karar, her çağrı yeri ona uysun
   (T-013'teki stale-meta cache'i dahil).
3. `.txt` navigasyonunun repro'sunu yakala (Network sekmesi + hangi
   linkte): prefetch 404'ü mü, service-worker'sız cache mi, basePath'siz
   Link mi. Kökeni bulmadan kapatma.
4. Regresyon koruması: statik build'e basit bir link-audit scripti
   (out/ içindeki html'lerde basePath'siz internal href taraması) —
   build-static'e eklenebilir.

Doğrulama: canlıda (ya da `npx serve out` + basePath simülasyonu) dil
değiştir, lesson aç/kapa, geri tuşu, deep-link — URL hep
`/language-tutor/...` altında kalmalı; `.txt`'ye tek navigasyon olmamalı.
