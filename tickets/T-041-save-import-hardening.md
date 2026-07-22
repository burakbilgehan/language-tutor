---
id: T-041
title: Save import sertleştirme (kötücül trigger + statik boyut cap)
status: backlog
priority: p2
effort: M
confidence: high
depends: []
created: 2026-07-22
---
T-026 dalga 5 bulgusu. **Tehdit çerçevesi A** — kullanıcı sosyal
mühendislikle başkasının `.db`/save dosyasını yüklemeye kandırılır.
Bulgular fable-verifier'dan geçti; S1 orchestrator tarafından tam senaryo
koşularak empirik doğrulandı.

**S1 — LOW, CONFIRMED (empirik).** `src/lib/save/import.ts:122-129`.
Validation dosyayı `readonly` açıp (45) yalnız `integrity_check` + `SELECT`
koşuyor — bunlar trigger fire etmiyor. Ama swap sonrası dosya canlı DB
olunca `db.update(generationJobs)...run()` (ve sonraki app yazımları)
read-write bağlantıda çalışıyor; saldırganın `generation_jobs`'a (veya
dokunduğu bir tabloya) koyduğu trigger burada ateşlenir. Empirik test:
version-eşleşen (v8 `save_meta`) + `AFTER INSERT ON srs_cards ... DELETE
FROM profiles` trigger'lı DB probe'u GEÇİYOR ve app ilk yazımında profiles
tablosu siliniyor. Etki sınırlı: `load_extension` "not authorized"
(better-sqlite3 default kapalı, kod hiçbir yerde açmıyor) → trigger yalnız
SQL-düzeyi veri manipülasyonu, RCE/dosya erişimi YOK. Kapsam kullanıcının
kendi (zaten replace-all ile silinmiş) verisi + recursive-trigger DoS.

**S4 — LOW, PLAUSIBLE.** `src/lib/client-api.ts:596` + `src/db/browser.ts:264`
+ `OnboardingWizard.tsx:185`. 100 MB guard YALNIZ server route'unda
(`import/route.ts:6,20`); statik/browser ve onboarding load yolu keyfi
büyük dosyayı doğrudan wasm'a yüklüyor → çok-GB "save" → wasm OOM / tab
crash. Self-DoS.

**S2 — LOW/near-noise, PLAUSIBLE (T-040'a rider olarak da işaretli).**
Server import parse-then-check: `import.ts:44-48` saldırgan byte'larını
version gate'inden (65) ÖNCE `new Database` + `integrity_check`'e veriyor;
browser yolunda 15-byte magic-header ön-kontrolü var (`save-image.ts:63`),
server'da yok. Marjinal (integrity_check zaten tüm dosyayı parse ediyor,
libsqlite3 fuzz-hardened, readonly açılış) — ucuz defense-in-depth.

Önerilen yön: (S1) swap yerine doğrulanmış satırları TEMİZ şemaya kopyala
(trigger/view taşımaz), ya da import sonrası user-tanımlı trigger/view'ları
DROP et; (S4) statik/onboarding yoluna server'la aynı boyut cap'i; (S2)
server'a da magic-header ön-kontrolü. S2 tercihen T-040 ile beraber gider.
