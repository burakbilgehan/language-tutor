---
id: T-047
title: Bulut save-sync (R2 blob + seed-strip + client seam, manuel push/pull)
status: backlog
priority: p1
effort: L
confidence: medium
depends: [T-046]
created: 2026-07-26
---
Login'li kullanıcı kendi save'ini buluta yedekler / geri getirir. **T-032
Drive controller'ının R2 ikizi** — mimari aynı (blob-as-is), hedef Drive
yerine bizim R2.

- **Blob-as-is:** SQLite snapshot R2'ye (`saves/{userId}/latest.db` +
  opsiyonel versiyonlu geçmiş). Backend save formatını BİLMEZ, sadece saklar.
  Mevcut export/import kontratı korunur. `schemaVersion` metadata'da (D1) →
  uyumsuz sürüm reddedilir.
- **Seed-strip on upload (T-045 ölçümünden — 5-10x tasarruf):** 19 MB'lık
  save'in ~13 MB'ı seed-türevi content (vocab_entries/grammar_topics/
  kanji_entries, hepsi CDN'deki `public/*-seed`'de). Upload'tan önce seed'den
  gelen `ready` içerik satırlarını strip et; restore'da `applyGrammarSeed`/
  `applyKanjiSeed`/`applyVocabSeed` (mevcut altyapı) CDN'den geri doldurur.
  generation_jobs geçmişi de export'ta zaten kırpılıyor. Buluta giden blob
  ~2-4 MB'a iner. (Alternatif basit yol: sadece kullanıcı-üretimi tabloları
  export et — ama seed-strip mevcut restore altyapısını kullandığı için tercih.)
- **Client seam:** `src/lib/client-api.ts`'e üçüncü yol — `IS_STATIC` +
  authed → Worker API'sine sync (mevcut `src/lib/backup/controller.ts` Drive
  ikizi). Auth durumu T-046'dan.
- **Manuel push/pull (advisor: auto-on-change DEĞİL):** multi-MB blob her
  yazımda R2 Class A ops + kullanıcı uplink yakar. Drive gibi kullanıcı-tetikli
  "buluta gönder / buluttan getir". `updatedAt` ile last-write-wins;
  multi-device gerçek-sync sonraki iş.

**Güvenlik:** T-046'nın CSRF/origin/auth-before-execute kriterleri bu
route'lar için de geçerli — save upload/download authed + tenant-scoped
(kullanıcı yalnız kendi `saves/{userId}`'ine erişir).

Fence: `worker/` (top-level, T-045 iskeleti — `src/worker` DEĞİL) +
`src/lib/client-api.ts` + `src/lib/backup/*`.
T-046 ile aynı Worker → **auth önce merge**, sonra bu.
