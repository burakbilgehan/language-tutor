---
id: T-047
title: Bulut save-sync (R2 blob + seed-strip + client seam, manuel push/pull)
status: review
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

**T-047 uygulama kararları (2026-07-26):**

- **Strip kriteri = payload eşitliği, anahtar varlığı DEĞİL.** Satır ancak
  `status='ready'` + seed'de o slug/char/word VAR + saklanan `tr` payload'ı
  seed'inkiyle (aynı zod şemasından geçirilerek) DERİN EŞİT ise strip edilir.
  Yalnız anahtar bakmak, kullanıcının yeniden ürettiği içeriği (T-022) sessizce
  yok ederdi: slug seed'de var ama içerik ONUN. Restore CDN'deki jenerik
  sürümü geri koyar, emeği kalıcı gider, hiçbir yerde hata görünmez.
- **Dil-başına seed araması (düz map DEĞİL).** `basic-word-order`,
  `personal-pronouns`, `written-vs-spoken` hem ja hem zh gramer seed'inde
  FARKLI içerikle var; düz birleştirilmiş map ja satırını zh içeriğiyle
  kıyaslardı.
- **native-language kapısı (bulunan+düzeltilen VERİ KAYBI hatası).** Üç
  `apply*Seed` de `if (nativeLanguage !== "tr") return 0` ile başlıyor —
  paketlenmiş içerik Türkçe. Strip başta bunu aynalamıyordu: en-native bir
  profilde `{tr: <seed>, en: <kullanıcı içeriği>}` satırının `tr` yarısı
  siliniyor, restore'da `apply*Seed` doldurmayı REDDEDİYOR → kalıcı kayıp.
  Artık strip yalnız profili tr-native olan dillerde çalışıyor. Harness'ta
  düşman senaryo: ja en-native yapılınca gramer strip 554→256 düşüyor, 298 ja
  konusunun hepsi korunuyor.
- **Modül yeri:** `src/lib/save/seed-strip.ts` (`limits.ts` emsali), drizzle
  değil küçük bir `StripExec` portu üzerinden ham SQL. Böylece hem
  better-sqlite3 hem sql.js aynı kodu kullanıyor, `src/core/*`'a ve oradaki
  sql.js/query-builder kuralına hiç dokunulmuyor.
- **VACUUM zorunlu.** SQLite boşalan sayfaları tutuyor; VACUUM'suz dosya hiç
  küçülmüyor (ölçüldü: 17.5 MB → 17.5 MB). sql.js'te de çalıştığı doğrulandı.
- **schemaVersion R2 `customMetadata`'da (D1 değil):** tek yazım, blob ile
  sürüm arasında tutarsızlık penceresi yok, `head()` ile gövdeyi çekmeden
  okunuyor. D1 yalnız manuel push/pull'un ihtiyacı olmayan kullanıcılar-arası
  sorgu kazandırırdı. Backend formatı BİLMİYOR: sürüm etiketi opak, uyumu
  istemci beyan ediyor, Worker yalnız uyumsuzsa vermeyi reddediyor (409).
- **API tabanı:** varsayılan aynı-origin göreli `/api/*` (T-046 siteyi ve
  API'yi tek origin'den veriyor → üretimde ayar yok). `readDriveClientId()`
  kalıbında localStorage override yalnız iki ortam için: dev :3000→:8787 ve
  anonim-only GitHub Pages aynası (orada ayarsız kalır, `/api/save` 404 verir,
  controller "bulut yok" der — o aynada doğru davranış).
- **Pull'da seed'ler EAGER yeniden uygulanıyor.** Doğrulandı (varsayılmadı):
  `apply*Seed` yalnız grammar/kanji/vocab LİSTE yollarından çağrılıyor;
  `saveImportApi`/`restoreFromDrive` çağırmıyor. Drive'ın blob'u tam olduğu
  için sorun olmuyordu; bizimki kasten eksik — eager çağrı olmasa kütüphane
  kullanıcı üç sayfayı da gezene kadar boş görünürdü. Hata-toleranslı:
  çevrimdışıysa satırlar pending kalır (bugünkü tembel davranış).

**Boyut tahmini tutmadı — ticket'ın öngörüsü yanlış varsayıma dayanıyordu.**
Gerçek: 17.54 MB → **8.55 MB** (2.05x), tahmin ~2-4 MB'dı. Sebep ölçüldü:
ÜÇ tablonun içeriği %100 silinse bile dosya 7.5 MB'da kalıyor. Kalanın büyük
kısmı statik index satırları (13k+ vocab satırı) ve **`generation_jobs`
geçmişi (8.430 satır, 2.4 MB — stripped blob'un %28'i)**. Ticket "generation_jobs
geçmişi de export'ta zaten kırpılıyor" diyor ama `export.ts` yalnız
`queued`/`running` siliyor; `done`/`error` geçmişi duruyor. Ucuz kazanç olarak
iş geçmişini YALNIZ bulut strip yolunda düşürmek mümkün (yerel save
kontratını değiştirmemek için `export.ts`'e dokunmadan) — kapsamı sessizce
genişletmemek için yapılmadı, ayrı karar olarak bırakıldı.
