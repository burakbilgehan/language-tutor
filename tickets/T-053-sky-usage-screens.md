---
id: T-053
title: Sky kullanım kuralları — mevcut ekranlara uygula (before/after)
status: done
priority: p2
effort: M
confidence: medium
depends: [T-052]
created: 2026-07-27
---
T-052 sky token'ları/mark'ı kurunca, handoff'un **renk kullanım kurallarını**
mevcut UI'a uygula. Referans: `design/okumo-sky/Okumo Ekranlar Önce Sonra.dc.html`
(5 ekran before/after mock) + README "Color usage rules".

Kural: **sky = bilgi/state**, **terracotta = yalnız aksiyon** (sayfa başına
max BİR baskın terracotta odak). Uygulanacak dönüşümler:
- Linkler, "nasıl çalışır" kutuları, ipucu/info banner'ları, progress bar'lar,
  seçili/focus state'leri → sky.
- Focus stili: 1.5px `--sky` border + 4px `rgb(79 147 176 / .15)` ring.
- Terracotta yalnız: primary buton, aktif tab, oynanabilir ders node'u, ünite
  etiketi, kutlama.

Handoff before/after gösteren 5 ekran (fence):
- **Roadmap** (`/map`) — node/ünite renkleri, progress
- **Lesson** (`LessonPlayer`) — ipucu/açıklama kutuları, progress
- **Grammar** (`GrammarTopicView`/`GrammarTable`) — info kutuları, linkler
- **Onboarding** (`OnboardingWizard`) — adım göstergesi, info
- **Settings** — bölüm başlıkları, info banner'ları, focus

Tasarım-duyarlı iş (kör find-replace değil — hangi terracotta "aksiyon" hangi
"süs" ayrımı yargı ister; mock'lar rehber). before/after mock'larını birebir
hedefle. Doğrulama: her ekran dark/light iki temada + mock ile karşılaştır.
Fence: yukarıdaki 5 ekranın component'leri; T-052 (globals/CozyButton/
StatsHeader) bittikten SONRA. Bu ekranların paylaştığı ortak component'lere
(CozyButton zaten T-052'de) dikkat — çakışma varsa dar tut.
