---
id: T-063
title: Bağlantı durumu kartı + "köprün kapalı" hata yönlendirmesi
status: backlog
priority: p3
effort: S
confidence: high
depends: [T-060]
created: 2026-07-27
---
Bağlandıktan SONRA görünürlük bugün sıfır: "neye bağlıyım, hangi model
çalışıyor, köprüm ayakta mı?" hiçbir yerde yok; bridge kapanınca kullanıcı
bunu ders üretimi patlayınca öğreniyor.

## Kapsam
- Settings'te durum kartı: "Bağlı: DeepSeek · Denge profili (V3 / R1)" —
  T-057 katalog adlarıyla; lokal kapıda canlı durum ("köprü ✓ çalışıyor /
  ✗ erişilemiyor", T-059 /health probe'u — yalnız settings açıkken).
- Üretim hatası anında teşhis: lokal sağlayıcıda fetch hatası alınırsa
  probe atıp ayrıştır — "köprün kapalı görünüyor, yeniden başlat:
  `npx okumo-bridge`" vs gerçek üretim hatası. Cryptic fetch error'ı
  kullanıcıya sızdırma.
- Header'daki mevcut unconfigured nudge'ı korunur; genişletme (bağlıyken
  sağlayıcı rozeti) opsiyonel, şişirme.

Fence: settings komponentleri + hata yakalama noktaları (LessonPlayer/
ChatPanel'in hata yolları); provider seam'e dokunmaz.
