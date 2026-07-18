---
id: T-015
title: Mobil uyumluluk geçişi (responsive pass)
status: backlog
priority: p2
effort: L
confidence: medium
depends: []
created: 2026-07-18
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
