---
id: T-006
title: nl zayıf ayrılabilir fiiller (opbellen → opgebeld)
status: backlog
priority: p3
effort: S
confidence: high
depends: []
created: 2026-07-17
---
splitSeparable sadece STRONG tabanlı fiilleri bölüyor; zayıf ayrılabilir
fiil (opbellen) düz zayıf muamelesi görüp *geopbeld üretir (doğrusu
opgebeld, belde ... op). Çözüm: SEP_PREFIXES + kalan kısmın geçerli
fiil olup olmadığına dair heuristik (ünsüz başlangıç + uzunluk) ya da
küçük yaygın-fiil listesi. Testlere opbellen/aanraken/uitleggen ekle.
