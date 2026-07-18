---
id: T-017
title: Kullanıcı feedback mekanizması (sorun tarifi + öneri + screenshot)
status: backlog
priority: p2
effort: M
confidence: medium
depends: []
created: 2026-07-18
---
Site canlıda; kullanıcı feedback'leri bir yere düşmeli. İki tür girdi:
sorun bildirimi (screenshot'la tarif edebilmeli) ve öneri (kullanıcıya
product management yaptırma). UI: her sayfadan erişilebilir küçük bir
"feedback" butonu → modal (tür seçimi, açıklama, opsiyonel screenshot).

Kısıt: statik deploy (GitHub Pages) — backend yok. Seçenekler:
1. **GitHub Issues prefill URL**: `github.com/.../issues/new?title=&body=`
   ile aç. Sıfır altyapı ama screenshot upload yok (kullanıcı issue'ya
   kendisi sürükler) ve GitHub hesabı gerektirir.
2. **Form servisi (Formspree/Getform benzeri)**: anonim çalışır, dosya eki
   destekler, e-postaya düşer. Ücretsiz tier limitleri var.
3. **Kendi endpoint'i (Cloudflare Worker + repo'ya issue açan token)**:
   en temiz UX (anonim + screenshot → issue'ya base64/asset), ama ilk kez
   sunucu tarafı bileşen demek.

Öneri: MVP = 1 + screenshot'ı kullanıcının panosuna/indirmesine hazırlama
(html2canvas ile sayfa görüntüsü çek, kullanıcı issue'ya yapıştırır);
hacim artarsa 3'e geç. Karar implement eden session'da verilecek —
seçenekler arası fark UX, mimari değil.

Not: screenshot çekimi (html2canvas veya `getDisplayMedia`) statik modda
çalışır; LLM konfigürasyonu/kişisel veri sızmasın diye ekran görüntüsünde
settings sayfası uyarısı göster.
