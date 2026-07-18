---
id: T-015
title: Mobil uyumluluk geçişi (responsive pass)
status: done
priority: p2
effort: L
confidence: medium
depends: []
created: 2026-07-18
closed: 2026-07-18
---
Şimdiye kadar hiç bakılmadı; site canlıda ve mobilden açan herkes için
kırık/daralmış olabilir. Hedef: telefonda rahat kullanılabilir uygulama.

Kapsam (denetlenecek yüzeyler):
- Nav/header (StatsHeader + sekmeler — dar ekranda taşma muhtemel)
- Roadmap/map görünümü
- Lesson + egzersiz akışı (input'lar, klavye açılınca layout)
- Grammar / Sözlük (vocab) / Kanji master-detail ikilileri — mobilde
  sidebar+detay yan yana sığmaz, stack veya drawer gerekir
- Çekim, Pinyin, Kana, Tekrar (review), Sohbet, Settings, Onboarding

Yaklaşım önerisi: tek dev PR yerine sayfa sayfa ilerle (önce nav + lesson +
master-detail kalıbı; kalıp bir kez çözülünce grammar/vocab/kanji üçü de
aynı fix'i alır). Tailwind breakpoint'leriyle (`sm:` altı hedef) çöz;
ayrı mobil layout yazma. `CenteredPage` gibi paylaşılan layout bileşenleri
kaldıraç noktası.

Doğrulama: Chrome devtools device emulation (390px) + gerçek telefonda
Pages canlısı. Effort L çünkü yüzey çok; tek tek sayfalar S.

## Sonuç (2026-07-18)

Plan öncesi fable-planner ile kod okundu: premise'in çoğu yanlış çıktı —
grammar/vocab layout zaten `?topic=`/`?word=` URL-gate ile mobilde stack
oluyor (drawer değil, doğru karar), stroke trainer zaten `lg:flex-row`,
map lesson paneli zaten mobilde `w-full`. Conjugate/pinyin tabloları
`overflow-x-auto` içinde, sayfa taşmıyor.

Gerçek kırık tek nokta: **map bubble'lar** — `translateX(sin*90)` sabit
genlik 320-375px ekranlarda label'ı taşırıyordu (analitik: 386px'te
margin 31px, 320px'te negatife düşüyordu). Fix: genliği `min(90px, 18vw)`
ile viewport'a göre ölçekledim (`RoadmapView.tsx`).

Diğer küçük iyileştirme: onboarding kart padding'i `p-8` → `p-5 sm:p-8`
(320px'te sıkışıktı, kırık değil).

Doğrulanan/dokunulmayan: header-h (101px, mobilde tutarlı), lesson input
akışı (normal flow, klavye sorunu yok), chat composer (`sticky bottom-4`
+ `dvh`, kod okuması sorunsuz görünüyor ama **gerçek cihazda
doğrulanmadı** — Chrome resize_window tool'u bu oturumda viewport'u
gerçekten değiştirmedi, sadece ilk denemede tutarlı sonuç verdi; kalan
adımlar kod okuması + matematiksel doğrulamayla yapıldı), settings/
onboarding grid'leri (metin wrap ediyor, clip yok).

Açık kalan: gerçek telefonda canlı (Pages) doğrulaması yapılmadı —
kullanıcı adımı.
