---
id: T-058
title: Katalog tazelik mekanizması — model id'lerini güncel tutan Worker doğrulaması
status: backlog
priority: p3
effort: M
confidence: medium
depends: [T-057]
created: 2026-07-27
---
Burak kararı (2026-07-27): küratörlü model kataloğu (T-057) bayatlamaya
mahkûm; "doğru ve up to date tutacak internal mekanizma / worker" istiyor.

## Tasarım (öneri — implement session'ında netleşir)
- Worker'a `GET /api/llm-catalog`: sürümlü katalog JSON'u servis eder
  (kaynak: worker repo'sunda tek JSON; KV şart değil).
- Worker cron (haftalık): katalogtaki id'leri OpenRouter `GET /models`'a
  (herkese açık, key'siz) karşı doğrular; OpenRouter-dışı sağlayıcılar için
  eşlenebilen slug'larla en-yakın kontrol. Ölü/rename id bulursa NE otomatik
  değiştirir NE sessiz kalır — rapor üretir (basit: cron sonucu KV'ye,
  `/api/llm-catalog` yanıtında `staleWarnings` alanı; Burak görünce JSON'u
  günceller). Küratörlük insanda kalır, mekanizma bekçilik yapar.
- Client: build'e gömülü katalog HER ZAMAN fallback; runtime'da
  `/api/llm-catalog` fetch'i başarılıysa üstüne biner (same-origin okumo.dev;
  server modda route yoksa sessizce fallback). Kullanıcı deneyimi fetch
  başarısına asla bağlanmaz.

Fence: `worker/` + `src/lib/llm/catalog.ts` yükleme katmanı. T-061 wizard
tarafına dokunur — aynı dalgada koşarlarsa catalog.ts kesişimini başlamadan
doğrula.
