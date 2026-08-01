---
id: T-072
title: Köprüde iş kimliği + sonuç önbelleği — refresh/kopma üretimi öldürmesin, biten iş kaybolmasın
status: open
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

## Dikkat

- Store/queue dedup'ı (lesson-gen-store + browser-queue) client tarafında
  zaten tekilleştiriyor; bu ticket köprü tarafındaki kaybı kapatır.
- Eski köprü / eski uygulama kombinasyonları alanı yok saymalı (bridge_*
  gövde alanı geleneği).
- Önbellekte ham LLM çıktısı tutulur; token/maliyet yok, RAM sınırlı ve
  TTL'li olmalı.
