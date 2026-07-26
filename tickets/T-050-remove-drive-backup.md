---
id: T-050
title: Google Drive yedeklemeyi tamamen kaldır (cloud-sync yerini aldı)
status: in-progress
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
