---
id: T-050
title: Google Drive yedeklemeyi tamamen kaldır (cloud-sync yerini aldı)
status: done
priority: p1
effort: M
confidence: high
depends: [T-047]
created: 2026-07-27
---
Burak kararı (2026-07-27): T-032'nin Google Drive OAuth yedekleme ayağı
tamamen silinsin — okumo.dev cloud-sync (T-047) artık bu ihtiyacı karşılıyor.

Kaldırılacaklar: Drive OAuth/gapi akışı, Drive upload/restore/rotasyon,
Ayarlar'daki Drive bölümü + client-id alanı, BackupBar'ın Drive restore
önerisi, ilgili i18n kopya.

KALACAKLAR (dikkat — Drive'a dolanmış paylaşılan altyapı):
- Dosya export/import (save yedeği) ve yedekleme teşvik çubuğu (nag bar).
- `writeBackupState`/`markBackedUp` state makinesi — cloud push/pull bunu
  kullanıyor (T-047 fix 4).
- `isLocalEmpty`, `getLessonCount`, `emitBackupChange` — cloud.ts bunları
  `controller.ts`'ten import ediyor; controller silinirken bunlar uygun bir
  paylaşılan modüle taşınmalı (cloud.ts mantığı DEĞİŞMEZ, sadece import yolu).
- BackupBar "remote daha yeni" mantığı: Drive kalkınca tek remote cloud —
  Drive şıkkı sökülür, cloud pull önerisine bağlanabilir (minimal tutulsun).

DB/save formatına etki yok (Drive token'ları memory-only'ydi, state
localStorage'da) — SAVE_SCHEMA_VERSION'a DOKUNMA. CLAUDE.md'deki Drive
referansları güncellenmeli. Google Cloud Console'daki eski
`language-tutor-web` Drive client'ı + Drive API yetkisi ayrı ops adımı
(uygulama artık kullanmıyor; silinmesi opsiyonel, ticket kapsamı dışı).

**T-050 uygulama kararları (2026-07-27):**

- **`controller.ts` adı KORUNDU, içi boşaltıldı.** Ticket "uygun bir paylaşılan
  modüle taşınmalı" diyor; taşımak yerine Drive yarısını dosyadan sildim.
  Gerekçe: `isLocalEmpty`/`getLessonCount`/`emitBackupChange` zaten oradaydı ve
  cloud.ts + client-api.ts + use-backup.ts + BackupBar hiçbiri import yolu
  değiştirmedi — yani cloud.ts'e (fence: yalnız import yolu) tek satır bile
  dokunulmadı. Bunları `state.ts`'e taşımak daha kötü olurdu: o dosyanın "PURE
  logic, tarayıcı yok" sınırı `backup.test.ts`'in node:test altında koşmasını
  sağlayan şey, `isLocalEmpty` ise `@/db/browser` çekiyor.
- **Ticket'ın KALACAKLAR listesi eksikti.** Yalnız cloud.ts'in import ettiği üç
  fonksiyon sayılmış; `controller.ts` bunların yanında `onLessonCompleted`
  (+`bumpLessonCount`), `maybeSnapshot`, `recordManualExport` ve
  `subscribeBackup`'ı da tutuyordu. `onLessonCompleted` ders sayacını artıran
  TEK yer — silinseydi ticket'ın açıkça KALSIN dediği nag bar bir daha hiç
  tetiklenmezdi. Fonksiyon korundu, içinden yalnız `void autoUpload()` çıktı.
- **`queue.ts` + `sync-queue.ts` de silindi** (ticket'ta adı geçmiyor): token
  süresi dolunca yüklemeyi kuyruğa alan re-auth makinesi tamamen Drive'a aitti
  — cloud.ts hiçbirini import etmiyor (grep'le doğrulandı), çünkü bulut senkronu
  manuel push/pull. Beraberinde `BackupView.needsReauth` ve BackupBar'ın
  "yeniden bağlan" şıkkı gitti.
- **BackupBar'ın "remote daha yeni" teklifi buluta BAĞLANMADI, kaldırıldı.**
  Ticket "cloud pull önerisine bağlanabilir (minimal tutulsun)" diyor; minimal
  değil: her sayfa açılışında giriş yapmış her kullanıcı için bir `cloudInfo()`
  HEAD demek, üstelik arkasındaki pull yıkıcı replace-all olduğu için kendi
  onayını da gerektirir. T-048 pull teklifini zaten iki doğru yere koymuş
  (dönüş ayağı + Ayarlar). BackupBar artık tek dallı: yedekleme hatırlatıcısı.
- **`rotate.ts` yaşıyor:** `pruneToK` yerel IndexedDB snapshot rotasyonunda hâlâ
  kullanılıyor (`src/db/browser.ts`). Yalnız Drive karşılaştırmasının kullandığı
  `isRemoteNewer` silindi.
- **Silinen testler (rapora geçsin):** `syncReducer` üç vakası + `isRemoteNewer`
  bir vakası modülleriyle birlikte gitti; Drive-modifiedTime'lı `pruneToK`
  vakası artık hizmet ettiği snapshot deposuna göre yeniden yazıldı. Toplam
  106 → 102 test.
- **CLAUDE.md'de Drive bölümü YOKTU** (grep'teki eşleşmeler "drizzle driver" ve
  "Drives the output language"). Kaldırılacak referans olmadığı için, T-047/
  T-048'i de hiç belgelemeyen dosyaya tek bir "Cloud save-sync" maddesi eklendi.
- **Kaldırılacak npm bağımlılığı yok:** Drive, GIS'i `<script>` etiketiyle
  yüklüyordu (`accounts.google.com/gsi/client`), package.json'da hiçbir izi
  yoktu. Lockfile'a dokunulmadı. `out/` build'inde `gsi/client`/`drive.appdata`/
  `googleusercontent` araması boş dönüyor.
- **Fence dışı kalan artıklar (kasten dokunulmadı):** `src/db/browser.ts`
  satır 69 ve 281'de iki bayat Drive yorumu var (yalnız yorum, davranış yok).
