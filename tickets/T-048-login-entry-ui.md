---
id: T-048
title: Giriş UI — anonim/load + login seçeneği + buluttan getir
status: backlog
priority: p2
effort: M
confidence: high
depends: [T-047]
created: 2026-07-26
---
Backend uçtan uca çalışınca kullanıcı yüzeyini bağla. Girişte insanlar YİNE
anonim katılma + kayıt yükleme ekranıyla karşılansın (mevcut T-025
onboarding load/new), **artık bir de login seçeneği** olsun.

- **Onboarding'e üçüncü kapı:** "Anonim başla" / "Kayıt yükle (dosya)" /
  **"Giriş yap"** (Google + magic-link). Anonim akış hiç değişmez (local-first).
- **Login sonrası:** kendi save'ini **buluttan getir** (T-047 pull) — ya da
  yeni cihazda ilk kez ise buluta gönder. Hesap durumu göstergesi (kim giriş
  yapmış, son sync zamanı).
- **Ayarlar:** çıkış yap, "buluta gönder / buluttan getir" (Drive
  butonlarının yanında ya da yerine), hesap bağla/çöz.
- **i18n:** yeni kopya tr/en (mevcut co-located `S` kalıbı).

Fence: onboarding component'leri + ayarlar + auth-durumu hook'u. Worker
kodu (T-046/T-047) bittiğinde bu saf frontend → dosya kümesi büyük ölçüde
ayrık.

**T-048 uygulama kararları (2026-07-26):**

- **Magic-link yok** (T-046 sahip kararı) — üçüncü kapı yalnız Google.
- **better-auth client paketi EKLENMEDİ, elle fetch.** Gerekçe: kullanılan
  yüzey iki uç nokta (`POST /api/auth/sign-in/social` → `200 {url}`,
  `GET /api/auth/get-session`) + `POST /api/auth/sign-out`, ve bu şekiller
  zaten `worker/test/session.test.ts` ile kilitli. Kök `package.json`'a bir
  auth kütüphanesi eklemek, çoğunlukla anonim çalışan statik bundle'a
  gereksiz ağırlık olurdu. Kök bağımlılıklar DEĞİŞMEDİ.
- **`cloudAvailable()` render kapısı olarak KULLANILAMAZ** (bulunan tuzak):
  `IS_STATIC && isSignedIn()` — yani giriş yapmadan false, dolayısıyla "giriş
  yap" butonunu ona bağlamak kilitlenme olurdu (butonu görmek için giriş
  yapmış olman gerekir). Doğru ayırt edici "bu origin'de backend var mı" ve
  bu zaten açık bir uç nokta: Worker'da `GET /api/health` → 200, anonim-only
  GitHub Pages aynasında 404. Probe `useAuthStatus` içinde, `readCloudApiBase()`
  ile — hiçbir origin gömülü değil. `cloudAvailable()` push/pull için
  (oturum gerçekten gerekli) hâlâ geçerli; T-047'de değişiklik yapılmadı.
- **`useAuthStatus` KARAMSAR varsayılan** (useLlmStatus'ün tersi, kasıtlı):
  `{user:null, loading:true}`. Sunucu doğrulamadan "giriş yapıldı" yazmak
  yalan olurdu ve arkasındaki her düğme ilk tıklamada patlardı.
- **OAuth dönüş ayağı `useSearchParams` KULLANMIYOR.** `/onboarding` sayfasının
  `<Suspense>` sarmalayıcısı yok; hook'u eklemek statik export'u kırardı
  (build çalıştırma izni yoktu → doğrulanamaz risk). Marker
  `window.location.search`'ten `useEffect` içinde okunuyor.
- **`callbackURL` mutlak URL:** `window.location.origin + withBase("/onboarding")
  + "?cloud=return"`. Göreli `"/"` API-base override'ı varken Worker'ın kendi
  köküne düşerdi. **Doğrulanmadı, sahibe not:** better-auth `callbackURL`'i
  `trustedOrigins(env)`'e karşı doğruluyor — üretimde aynı-origin olduğu için
  sorunsuz, ama dev (:3000) ve olası ayna senaryolarında site origin'inin o
  allowlist'te olması gerekir (Worker config'i, bu ticket'ın fence'i dışında).
- **Dönüş ayağı akışı:** oturum çözüldükten sonra körlemesine `cloudPull()`
  DEĞİL — `cloudInfo()` (HEAD, egress yok). 404 → "buluta henüz kayıt
  göndermemişsin" + normal onboarding'e devam; var → pull teklifi. Körlemesine
  pull "ilk cihaz" senaryosunu hata gibi gösterirdi.
- **Pull onayı:** replace-all olduğu için dosya-import akışıyla aynı ağırlıkta
  `window.confirm`. Yalnız profil olmadığı DOĞRULANMIŞ oturumda atlanıyor
  (`!checkingProfiles && usedLanguages.length === 0`); henüz bilinmiyorsa
  soruluyor — güvenli taraf.
- **`PullResult.warnings` toast DEĞİL.** Onboarding'de pull sonrası
  `/map`'e yönlendirme listeyi çöpe atardı; uyarı varsa yönlendirme
  BEKLETİLİYOR, `CloudWarnings` maddeleri sayarak gösteriyor, kullanıcı
  onaylayınca devam ediliyor. Ayarlarda bölüm state'inde kapatılana kadar duruyor.
- **Kontrat pürüzü (düzeltilmedi, kasıtlı):** `pushToCloud` 413'te
  `AppError("save_invalid")` fırlatıyor, ama paylaşılan katalog bu kodu
  "Geçersiz kayıt dosyası (SQLite değil)" diye gösteriyor — fazla büyük ama
  gayet geçerli bir kayıt için yanlış bilgi. `src/lib/i18n/errors.ts`
  değiştirilmedi (aynı kod sunuculu dosya-import yolunda da kullanılıyor);
  bunun yerine `src/lib/cloud-error.ts` kodları UI "kind"lerine çeviriyor ve
  buluta özel kopya component'lerin kendi `S` tablosunda. 413 → "30 MB sınırı",
  503/404 → "servise ulaşılamadı, kaydın sağlam".
- **Test edilebilir çekirdek ayrıldı:** `describeCloudError` saf fonksiyon,
  `src/lib/cloud-error.test.ts` (6 test) `npm test` glob'una giriyor —
  tarayıcıya bağımlı bir özelliğin kanıtlanabilir tek parçası.
- Anonim akış hiç değişmedi: üçüncü kapı yalnız `auth.backendAvailable`
  true iken render ediliyor, hiçbir yerde kapı/gate değil.
