---
id: T-072
title: Köprüde iş kimliği + sonuç önbelleği — refresh/kopma üretimi öldürmesin, biten iş kaybolmasın
status: done
priority: p2
effort: M
confidence: medium
depends: []
created: 2026-08-01
---

## Olay (2026-08-01, ます ile fiiller kilidi sırasında)

Asıl kilit şema hatasıydı (retry'a schemaHint gitmiyordu; aynı gün düzeltildi:
üç provider'da `prompt + schemaHint`, köprüye `bridge_json_schema` →
`claude --json-schema`). Ama olay sırasında ikinci bir gerçek kayıp görüldü:
sayfa refresh'i in-flight fetch'i abort ediyor, köprü de (8be11c0, doğru
gerekçeyle) CLI sürecini öldürüyor. 2-3 dakikalık üretim çöpe gidiyor; yeni
sayfa aynı üretimi sıfırdan başlatıyor. Köprü loglarındaki "iptal: istemci
vazgeçti" satırlarının bir kısmı buydu.

## İstenen davranış (Burak'ın talebi)

Bekleyen iş ile köprüde koşan iş unique bir kimlikle bağlansın; hiçbir iş
orphaned kalmasın:

- Uygulama her mantıksal üretim için bir `bridge_job_id` üretir (ör.
  `lesson:<nodeId>:<attemptNonce>`), localStorage'da queueKey → id saklar.
- Köprü: bağlantı koparsa job_id'li işi ÖLDÜRMEZ; bitirir, sonucu TTL'li
  (örn. 10 dk) bellek önbelleğine yazar.
- Aynı job_id ile gelen yeni istek: iş koşuyorsa ATTACH (aynı sonucu bekler),
  bitmişse önbellekten anında döner. Refresh sonrası sayfa aynı id ile
  yeniden istek atar ve kaldığı yerden devam eder.
- Kullanıcının GERÇEK iptali ayrışır: açık bir iptal sinyali (örn.
  `POST /v1/cancel {job_id}` ya da job_id'siz istek semantiği) CLI'ı bugünkü
  gibi öldürür. "Vazgeç" butonunun anlamı değişmemeli (T-070-C).

## Uygulama (2026-08-01, aynı gün)

- Kimlik localStorage yerine DETERMİNİSTİK: SHA-256(model+system+prompt)
  (`computeBridgeJobId`, browser-provider). Refresh aynı prompt'u kurar,
  aynı kimlikle koşan işe bağlanır ya da önbellekten alır; depolama yok.
  Retry prompt'u (zod hataları eklenir) doğal olarak farklı kimlik üretir.
- Köprü: `jobs` haritası; kimlikli işte kopan bağlantı CLI'ı öldürmez
  (cancel.keepAlive), sahipsiz biten BAŞARILI sonuç 10 dk TTL ile bekler ve
  BİR KEZ teslim edilir (consume-once: regenerate bayat sonuç yemesin).
  Hata/iptal önbelleğe yazılmaz. Koşan işe ikinci istek ATTACH olur (çok
  sekme aynı işi paylaşır, ikinci CLI yok).
- Gerçek iptal: `POST /v1/cancel {job_id}`; istemci yalnız kullanıcı
  iptalinde gönderir (timeout abort'unda GÖNDERMEZ: iş sahipsiz bitip
  önbelleğe düşsün diye).
- Doğrulama: canlı köprüde 3 akış test edildi; kopan istemci → "sahipsiz
  bitti" + 17ms önbellek teslimi; /v1/cancel → CLI kill.

## Dikkat

- Store/queue dedup'ı (lesson-gen-store + browser-queue) client tarafında
  zaten tekilleştiriyor; bu ticket köprü tarafındaki kaybı kapatır.
- Eski köprü / eski uygulama kombinasyonları alanı yok saymalı (bridge_*
  gövde alanı geleneği).
- Önbellekte ham LLM çıktısı tutulur; token/maliyet yok, RAM sınırlı ve
  TTL'li olmalı.
