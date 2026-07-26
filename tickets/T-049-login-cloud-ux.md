---
id: T-049
title: Login/cloud UX düzeltmeleri (return-leg çıkmazı + import→push köprüsü + signed-in intro)
status: done
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

**T-049 uygulama kararları (2026-07-27):**

- **Gizli `<input type="file">` showIntro JSX'inin İÇİNDEydi** — dönüş ayağı
  ayrı bir erken return olduğu için orada mount edilmiyordu, yani
  `fileInputRef.current?.click()` sessizce hiçbir şey yapmayacaktı. Input her
  iki dalın da render ettiği tek bir `fileInput` değişkenine çıkarıldı. Fix 1'i
  "çalışıyor gibi görünüp çalışmayan" hâle getirecek olan buydu.
- **Import→push onay semantiği iki yüzeyde KASTEN farklı.** Onboarding'de
  inline teklifin kendisi onaydır (kullanıcı dosyayı saniyeler önce seçti, ilk
  cihaz push'ının ezeceği bir şey yok) — üstüne `window.confirm` koymak aynı
  tıklamada iki onay olurdu. Ayarlar'da `window.confirm` KORUNDU: orada bulutta
  başka bir cihazdan gelmiş gerçek bir kayıt olabilir ve kullanıcı oraya bir
  giriş akışından gelmemiş olabilir.
- **Push-after-import'un veriyi görmesi doğrulandı (varsayılmadı):**
  `pushToCloud` → `isLocalEmpty()` → `getActiveProfile(handle.db)`;
  `importBytes` `live`'ı yeniden atıyor ve `handle.db` `live` üzerinde bir
  Proxy (`src/db/browser.ts:225`), yani okumalar her zaman güncel imaja gidiyor.
  Düz bir property olsaydı mutlu yolda `local_empty` alırdık.
- **Intro'da import sonrası kapılar gizleniyor:** `showIntro` mount'ta
  hesaplandığı için "Yeni başla" tıklanabilir kalıyordu ve yeni yüklenen
  verinin ÜSTÜNE sihirbazı açardı.
- **`CloudWarnings` intro dalında da render ediliyor:** fix 3 ile pull artık
  intro kartından da başlatılabiliyor; warnings state'i yalnız dönüş ayağında
  render ediliyordu, yani seed-drift içerik kaybı sessiz kalırdı.
- **`auth.loading` sırasında hesap kartı "kontrol ediliyor" gösteriyor.**
  `useAuthStatus` karamsar varsayılanlı (T-048 kararı), naif
  `auth.user ? hesap : giriş` önce giriş kartını flaş ederdi.
- `cloudErrorText` push hatalarını da (`local_empty`, `too_large`) çeviriyor;
  T-048'de "onboarding hiç push yapmaz" gerekçesiyle dışarıda bırakılmışlardı,
  artık yapıyor.

**Tarayıcı gerektiren, ELLE doğrulanacaklar:** rapordaki kontrol listesi.
