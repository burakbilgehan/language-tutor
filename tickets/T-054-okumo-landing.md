---
id: T-054
title: okumo.dev landing sayfası (design handoff — ayrı scope)
status: backlog
priority: p3
effort: M
confidence: low
depends: [T-052]
created: 2026-07-27
---
Handoff'ta ayrı scope: okumo.dev için landing sayfası.
Referans: v1 mock `design/okumo-sky/Okumo Landing.dc.html` idi — v1 handoff
GEÇERSİZ ve silindi (git geçmişinde: `5ad0c88`). Bu iş çekildiğinde v2
Yūyake sistemi (`design/okumo-yuyake/`) baz alınır; landing mock'u v2'de
yok, DS v2 token/bileşen rolleriyle sıfırdan kurgulanır.

Şu an okumo.dev = uygulamanın kendisi (Worker static assets, anonim başlangıç
+ login). Landing = ürünü tanıtan, "başla" ile app'e geçiren pazarlama yüzeyi.
Açık kararlar (Burak):
- Landing app'in KÖKÜ mü (`/` landing → `/onboarding` app), yoksa ayrı yol mu?
- Statik export'a nasıl oturur (mevcut root pages kalıbı, `<Suspense>` kuralı)?
- Kapsam pazarlama-only mu (özellikler, ekran görüntüleri, "başla" CTA) yoksa
  fiyatlandırma/monetize mesajı da mı (monetize modeli henüz kararlaşmadı →
  şimdilik pazarlama-only tut).

Sky ailesi + Kumo mark (T-052) landing'de de kullanılır → depends T-052.
confidence low: landing içeriği/yapısı Burak'ın ürün mesajına bağlı, mock
başlangıç noktası. Tasarım + kopya ağırlıklı. Diğer içerik/güvenlik işlerine
göre düşük öncelik — okumo kamuya duyurulmadan önce çekilir.
