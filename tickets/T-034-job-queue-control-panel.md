---
id: T-034
title: Job kuyruğu kontrol paneli — görünürlük + cancel + boot'ta onay
status: backlog
priority: p1
effort: L
confidence: medium
depends: [T-024]
created: 2026-07-22
---
Bağlam: kullanıcının arka plan LLM kuyruğu üzerinde hiç kontrolü yok.
Somut acılar (Burak):
1. Grammar/kanji/vocab'da "tümünü üret" → geri dönüş yok, **cancel yok**.
   Yanlışlıkla başlatılan koca batch durdurulamıyor.
2. "İndir" deyip başka sayfaya geçen kullanıcı işi **unutur** → arkada
   sessizce token yakan bir kuyruk kalır, farkında olmaz.
3. Boot'ta `recoverStaleJobs` (`src/lib/jobs.ts:76-94`) bekleyen queued
   işleri **koşulsuz evlat edinip otomatik koşturuyor** — kaza kurtarma
   için doğru, import edilmiş/unutulmuş kuyruk için sürpriz. T-024 sadece
   import ANINDA belt vuruyor; tekrar import'a basmadan (localStorage/
   IndexedDB'den) devam eden kullanıcıyı korumuyor.

Referans deneyim: `scripts/blast-dashboard.mjs` (:4646) — aktif/bekleyen/
biten job listesi, canlı durum. Son kullanıcıya aynı kontrolü ver.

Karar (Burak): T-024'ün mevcut fix'i (export strip + import belt) geçici
olarak yeterli — sürpriz kuyruğun ana vektörünü kapatıyor. Bu ticket
kalıcı, tam çözüm.

İş — ikili yerleşim (Burak kararı):
1. **Sağ-alt global pop** (mevcut anlık maliyet özetinin hemen üstünde,
   HER sayfadan görünür): aktif/bekleyen job sayısı + "hepsini durdur".
   Aktif iş yoksa görünmez/minik. Farkındalık her yerde.
2. **Ayarlar içinde tam panel** (blast-dashboard klonu): job listesi
   (jobType/refId/status/başlangıç), tek tek cancel + toplu cancel,
   biten/hatalı geçmiş. Detay burada.
3. **Cancel yolu**: queued → sil (dedupe kilidini de aç); running →
   iptal işaretle (CLI child'ı öldürmek zor olabilir — en azından
   sonraki adımı koşturma, `runJob`'a iptal-kontrolü). Yeni route:
   `POST /api/jobs/[id]/cancel` + `POST /api/jobs/cancel-all`. Core'a
   `cancelJob`/`cancelAllJobs` (env-agnostik, `src/core/*`), route ince
   kabuk. Statik modda inline batch için de bir dur mekanizması (Abort
   sinyali) — sekme kapanınca zaten ölüyor ama elle dur da olmalı.
4. **Boot'ta otomatik koşma yerine onay**: `recoverStaleJobs`'un
   queued-evlat-edinme adımını otomatik `runJob`'dan çıkar; bekleyen
   kuyruğu "recovery pending" olarak işaretle, panelde "N iş bekliyor —
   devam et?" göster. Crash-recovery korunur (elle tetiklenir), sürpriz
   otomatik koşma biter. **Davranış değişikliği** — commit'te not düş.
5. Server + statik mod paritesi (`client-api.ts` seam, `src/core/*`).
   Parity harness core'a dokununca koşar.
6. i18n: tr canonical + en mirror (co-located `S` tablosu).

Not — kanji liste GET auto-fill (T-024 sub-decision'da ertelendi): bu
panel gelince auto-fill kuyruğu da görünür/cancel'lanabilir olur; ayrı
"user-triggered'a çek" kararına gerek kalmayabilir. Panel'i implement
ederken tekrar değerlendir.

Review ekleri (backlog session, 2026-07-22):
7. **Liste endpoint'i yok**: `/api/jobs/` altında sadece `[id]` var.
   Pop + panel için `GET /api/jobs` (aktif/bekleyen + son N geçmiş)
   gerekiyor — hafif, LLM'siz; pop bunu poll'lar (roadmap'in 4s
   kalıbı emsal).
8. **Statik modda veri kaynağı**: job tablosu orada HİÇ kullanılmıyor —
   batch, client-api içinde inline döngü. Pop/panel statikte aynı UI'ı
   tarayıcı-içi bir kuyruk store'undan (module-level state + subscribe,
   AbortController'la iptal) beslemeli; `GET /api/jobs` yalnız server
   modu. Seam yine client-api.
9. **"Recovery pending" işareti şema tuzağı**: yeni KOLON ekleme —
   `generation_jobs` şekli değişir, SAVE_SCHEMA_VERSION bump + eski
   save'ler reddedilir. Text `status` kolonuna yeni DEĞER (ör.
   `pending_approval`) bump gerektirmez (`gradedBy:"self"` emsali).
   Yeni değerle git; eski app sürümü görmezse zaten koşmaz, güvenli yön.
10. **Sistem işi ≠ kullanıcı batch'i**: prefetch (ensureLessonJob) ve
   auto-extend de bu kuyruğa giriyor. Panelde etiketle (sistem/kullanıcı);
   "hepsini durdur" default'u kullanıcı batch'lerini hedeflesin — yoksa
   kullanıcı normal ders prefetch'ini görüp cancel'lar, node açılışları
   yavaşlar diye şikayet geri gelir.
11. **Ayrım KOLONSUZ yapılacak** (madde 9'daki tuzağın aynısı: "source"
   kolonu = şema şekli değişikliği = SAVE_SCHEMA_VERSION bump, değmez):
   jobType üzerinden kaba sınıflama — lesson/chapter = sistem
   (prefetch/auto-extend), grammar/vocab/kanji = kullanıcı batch'i.
   Lesson'da "kullanıcı açtı" vs "prefetch" ayrımı kaybolur; kabul —
   pop toplam sayı gösteriyor, panelde jobType etiketi yeterli.

Doğrulama: "tümünü üret" başlat → panelden gör → cancel → kuyruk durdu,
token akışı kesildi (llm_calls artmıyor); başka sayfaya geç → global pop
aktif işi gösteriyor; kirli save'i import etmeden boot → hiçbir job
otomatik koşmuyor, panel "devam et?" sunuyor; parity ALL PASS.
