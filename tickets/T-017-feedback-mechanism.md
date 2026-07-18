---
id: T-017
title: Kullanıcı feedback mekanizması (sorun tarifi + öneri + screenshot)
status: done
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

---
Uygulama (2026-07-18): seçenek 1 (GitHub Issues prefill).
`FeedbackButton.tsx` (layout'ta global, sol alt): tür seçimi + açıklama +
viewport screenshot → panoya (clipboard yoksa PNG indirme fallback) →
prefill'li issue sayfası. `html2canvas-pro` kullanıldı — Tailwind 4'ün
color-mix()/oklch çıktıları klasik html2canvas'ı kırıyor. Modal/buton
`data-feedback-ignore` ile capture dışı; /settings'te kişisel veri uyarısı.
Metadata: sayfa, mod (static/server), hedef dil, UA. Repo'da `feedback`
label'ı oluşturuldu (URL'deki labels= sadece yazma yetkisi olanda otomatik
uygulanır; anonim kullanıcıda düşer, sorun değil). Next dev indicator
sol alttan sağ alta taşındı (next.config `devIndicators.position`).
Hacim artarsa Cloudflare Worker'a geçiş hâlâ açık seçenek.

Revizyon (aynı gün): prefill MVP'si yetersiz bulundu (GitHub hesabı şartı,
screenshot elle, title=desc tekrarı) → seçenek 3 eklendi:
`workers/feedback/` Cloudflare Worker'ı POST'u alır, sahibin fine-grained
PAT'iyle (secret GITHUB_TOKEN) issue'yu repoya AÇAR (anonim kullanıcı, hesap
gerekmez) ve screenshot'ı `feedback-assets` branch'ine contents API ile
commit'leyip body'ye raw URL olarak gömer. Client: `NEXT_PUBLIC_FEEDBACK_URL`
set ise Worker'a JSON POST (screenshot jpeg dataURL), değilse eski prefill
fallback'i. Modala ayrı opsiyonel "Başlık" alanı eklendi; title artık
`[Sorun] başlık|sayfa`, açıklama sadece body'de. Deploy: wrangler login +
`secret put GITHUB_TOKEN` + deploy; Worker URL'i repo variable
NEXT_PUBLIC_FEEDBACK_URL olarak pages.yml'e akar. Anti-abuse: origin
allow-list + boyut limitleri (spam olursa Turnstile eklenir).
