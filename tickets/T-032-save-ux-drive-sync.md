---
id: T-032
title: Save teşviki + Google Drive otomatik yedekleme
status: done
priority: p2
effort: L
confidence: medium
depends: [T-024]
created: 2026-07-22
---
Statü (2026-07-22): iki faz da yapıldı. Faz 1 (header "Yedekle" çipi +
hatırlatıcı çubuk + IndexedDB son-K snapshot + storage.persist) ve Faz 2
(SaveBackend seam + Drive appDataFolder sync, GIS token client + raw REST,
token-süresi kuyruğu, açılışta daha-yeni-save sorusu). Tüm defter tutma
localStorage/IDB yan-kanalında — save imajına/DB'ye girmiyor (SAVE_SCHEMA
_VERSION dokunulmadı). Kurulum: docs/drive-backup-setup.md. Saf mantık 15
birim testle (src/lib/backup.test.ts); npm test 73/73, build + build:static
+ parity yeşil. GIS/Drive I/O tarayıcıda elle doğrulanacak (gerçek client ID
gerekli): bağla-yedekle-sil-geri-yükle turu, token-dolmuş sekmede sessiz
kuyruk + re-auth akışı, iki-sekme çakışması.

Karar (2026-07-22, Burak): client ID build'e GÖMÜLMEZ — owner'ın kişisel
Google projesi public üründe herkesin trafiğini taşıyamaz. Kullanıcı kendi
ID'sini girer (adımlar UI'da). Consent production'a alınmadı (testing modu
tek kullanıcıya yetiyor; production = public'e açılma eşiği paketi).

Serversız yaşadığımız için save dosyası TEK kalıcılık mekanizması —
statik modda IndexedDB silinirse (tarayıcı temizliği, cihaz değişimi)
ilerleme gider. Oyunlardaki save zihniyeti: kullandıkça ilerleme hem
indirilebilir dosya hem de otomatik olarak kullanıcının Drive'ına
yedeklensin (Burak, 2026-07-22).

İki faz — ilki ucuz ve hemen değerli:

**Faz 1 — teşvik + yerel emniyet (S):**
- Save export'u görünür yere çıkar (Settings'in derinliği yerine header/
  belirgin bir "Kaydet" akışı; T-028 ile komşu).
- Hatırlatıcı: son export'tan bu yana N gün / N tamamlanmış ders geçince
  nazik bir "ilerlemeni yedekle" çubuğu.
- Yerel sürümlü emniyet: IndexedDB'de son K otomatik snapshot (zaten
  image var; periyodik kopya ucuz). Tarayıcı temizliğine karşı korumaz
  ama bozuk-import/yanlış-tık senaryosunu kurtarır.
- `navigator.storage.persist()` iste — tarayıcının IndexedDB'yi sessizce
  silme ihtimalini azaltır.

**Faz 2 — Google Drive sync (M):**
- Cevap "çok iş mi?"ye: backend GEREKMEZ. Google Identity Services ile
  tarayıcıdan OAuth (token client), `drive.appdata` scope'u → save imajı
  kullanıcının Drive'ının appDataFolder'ına yazılır (kendi kotasında,
  Drive UI'ında görünmez; istenirse görünür klasör tercihi). Statik
  siteyle uyumlu; sadece bir Google Cloud OAuth client ID kaydı gerekir
  (origin bazlı, secret'sız).
- Akış: bağla (tek buton) → periyodik + önemli olay sonrası (ders bitişi)
  otomatik upload; açılışta Drive'daki daha yeni save varsa "yükle?"
  sorusu (çakışma = timestamp karşılaştırması, last-write-wins + son K
  sürüm saklama).
- Bilinen sürtünmeler: GIS access token ~1 saat (sekme açıkken sessiz
  yenileme çoğunlukla çalışır, gerektiğinde tek tıklık re-auth);
  verification süreci (scope hassas değil, appdata genelde kolay onay);
  multi-device çakışması (son K sürüm + tarih gösterimi yeterli).
- T-024 önkoşul: Drive'a giden imaj da job-kuyruğu taşımamalı.

Not (Burak'ın 1. maddedeki öngörüsü): ileride gerçek backend gelirse
(monetizasyon/auth), save hosting'i doğal ilk backend özelliği olur —
Faz 2'nin arayüzü (upload/download/sürüm listesi) o güne taşınabilir
şekilde soyutlansın (`SaveBackend` seam'i: drive | self-hosted).

Doğrulama: temiz profilde bağla-yedekle-sil-geri-yükle turu; token süresi
dolmuş sekmede otomatik yedeklemenin sessizce kuyruklandığını ve re-auth
sonrası aktığını gör; iki sekme/cihaz çakışmasında veri kaybı yok.
