---
id: T-049
title: Login/cloud UX düzeltmeleri (return-leg çıkmazı + import→push köprüsü + signed-in intro)
status: in-progress
priority: p1
effort: M
confidence: high
depends: [T-048]
created: 2026-07-27
---
Burak'ın okumo.dev'deki ilk gerçek kullanım turundan (2026-07-27) çıkan UX
kırıkları. Ayarlar → "Bulut Hesabı" bölümü mevcut ve tam (giriş/çıkış +
push/pull) ama akış onu hiç göstermiyor; kullanıcı "Google eşleme yok"
sanıyor. Üç düzeltme:

1. **Return-leg çıkmazı**: Login başarılı + bulutta kayıt yok → ekran yalnız
   "Try again / Continue" sunuyor. Elinde save dosyası olan kullanıcının doğal
   adımı eksik. Üçüncü aksiyon: **"Kayıt dosyası yükle"** (mevcut file-import
   akışı) → import başarılıysa AYNI ekranda "buluta gönder" önerisi (push).
2. **Import→push köprüsü**: Signed-in kullanıcı hangi yoldan olursa olsun
   (onboarding load kapısı, Ayarlar import) kayıt yüklediğinde, inline
   "buluta gönder?" önerisi görünsün (Ayarlar'daki bölüme köprü ya da yerinde
   push butonu).
3. **Signed-in intro**: Girişli kullanıcıya intro'da hâlâ "Sign in" kapısı
   gösteriliyor (T-048 bilinen polish borcu). Signed-in durumda o kart hesap
   durumu + "buluttan getir / buluta gönder" kısayoluna dönüşsün.

Fence: onboarding + settings component'leri + auth-status/cloud controller
TÜKETİMİ (cloud.ts/seed-strip mantığına dokunma), worker/'a dokunma.
i18n tr/en co-located S kalıbı.
