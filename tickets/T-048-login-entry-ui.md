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
