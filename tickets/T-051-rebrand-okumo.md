---
id: T-051
title: Rebranding — ürün adı okumo, Kumo maskot/asistan olarak kalır
status: backlog
priority: p2
effort: M
confidence: medium
depends: []
created: 2026-07-27
---
Ürün adı **okumo** oldu (domain okumo.dev, 2026-07-27). **Kumo** ürün adı
DEĞİL artık — bir bulut maskotu / chat asistanı personası olarak kalır
(ilerde görsel maskot eklenebilir). Marka hikayesi: "okumo"nun içinde "kumo"
saklı (o-kumo); Kumo = 雲 bulut, cloud-sync temasıyla uyumlu.

Burak şu an Claude design ile branding çalışıyor — asset'ler (logo, favicon,
renk/tipografi rafinesi, maskot görseli, OG image, tagline) geldikçe bu
ticket BÜYÜR. Aşağısı iskelet + envanter.

## KRİTİK kapsam ayrımı (agent kör replace ETMESİN)

**A) Ürün-adı yüzeyleri → "Kumo" yerine "okumo":**
- `src/app/layout.tsx:22` — `title: "Kumo — Dil Yolculuğun"` (+ metadata bloğu:
  description / openGraph / applicationName varsa)
- `package.json` `name` ("language-tutor" — okumo'ya)
- `README.md` başlık/tanım
- `CLAUDE.md` proje başlığı (ürün adı geçen satır)
- Manifest / PWA app title (varsa)

**B) Kumo = persona/asistan → DOKUNMA (maskot, doğru yerde kalıyor):**
- `src/components/chat/ChatPanel.tsx:18,30` — "Kumo ile Sohbet" / "Chat with Kumo"
- `src/lib/llm/prompts/chat.ts:14,26,29` — "Sen Kumo'sun" / "Kumo olarak cevap ver"
- `src/components/onboarding/OnboardingWizard.tsx:133,223` — "Ben Kumo"
- `src/components/lesson/LessonPlayer.tsx:25,72` — "Kumo bu dersi yazıyor"
Bunlar asistan karakteri = maskot. Burak ayrıca değiştirmek isterse ayrı karar.

**C) Altyapı adları (opsiyonel, ayrı iş):**
- `src/components/shared/FeedbackButton.tsx:18,178` — `kumo-feedback.*.workers.dev`
  URL + `kumo-feedback.png`. Worker adını değiştirmek = deploy işi + URL kırar.
  Rebranding'in parçası değil; istenirse ayrı.

## Büyüyecek kısım (Burak asset verdikçe)
- Logo + favicon + app icon (mevcut `public/*.svg` yerine)
- OG/Twitter kartı görseli (okumo.dev paylaşımları için)
- Tagline (şu an "Dil Yolculuğun" — kalacak mı?)
- Renk paleti / tipografi rafinesi (mevcut cream/terracotta/moss + Fraunces/
  Nunito — okumo kimliğiyle uyumlu mu, ayarlanacak mı?)
- Kumo maskot görseli (bulut karakteri; JP homofon 蜘蛛 örümceği çağrıştırmasın
  diye net "bulut" tasarlanmalı) — ilerde, ayrı olabilir.

Not: efor asset entegrasyonu geldiğinde M→L büyüyebilir. Envanter (A) mekanik
(sonnet); asset + copy revizyonu tasarım-duyarlı.

## Görsel kimlik AYRILDI (2026-07-27, Claude design handoff geldi)
`design/okumo-sky/` handoff'u renk/mark/landing'i getirdi → görsel iş ayrı
ticket'lara alındı: **T-052** (sky renk ailesi + Kumo mark SVG + info variant),
**T-053** (sky kullanım kuralları — 5 ekran), **T-054** (okumo.dev landing).
Bu ticket (T-051) SADECE **isim değişimi + marka copy'si/tone** kalıyor:
- (A) ürün-adı yüzeyleri → okumo (yukarıdaki envanter)
- Tone of voice + logo do/don't → `design/okumo-sky/Okumo Marka.dc.html`'den
  uygulanır (marka sesi copy'ye yansır).
Kumo maskot görseli artık soyut değil: header mark'ı T-052'de geliyor (bulut
SVG). T-051 = metinsel kimlik, T-052/53 = görsel sistem.
