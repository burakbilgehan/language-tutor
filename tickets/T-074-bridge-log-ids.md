---
id: T-074
title: Köprü loglarında iş kimliği tüm satırlara işlensin (sürüyor/bitti/iptal)
status: todo
priority: p3
effort: XS
confidence: high
depends: []
created: 2026-08-01
---

## Sorun

T-072 iş kimliğini yalnız "istek" satırına ekledi. `sürüyor` (heartbeat),
`bitti`, `iptal`, `sahipsiz bitti`, `önbellekten teslim` satırları yalnız
etiketle yazılıyor; aynı dersin iki işi aynı anda koşarken/kuyruktayken
loglar ayırt edilemiyor ("ne anlayım hangi iş?", 2026-08-01).

## İş

`scripts/llm-bridge.mjs`: job id (ya da id yoksa istek başına kısa bir yerel
sayaç) log satırlarının tümüne `id=xxxxxxxx` olarak eklensin. Heartbeat
closure'ı ve settle logları zaten job kaydına erişiyor; kroki basit.
Değişiklik sonrası `public` kopya deploy'la güncellenir (out/ kopyası
build-static'te otomatik).
