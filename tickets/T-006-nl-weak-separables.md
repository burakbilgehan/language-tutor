---
id: T-006
title: nl zayıf ayrılabilir fiiller (opbellen → opgebeld)
status: done
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

## Çözüm (2026-07-18)
`splitSeparable` artık STRONG tablo dışında `WEAK_SEPARABLE_BASES`
curated listesine de bakıyor (bellen/raken/leggen/... — yaygın zayıf
fiil tabanları). Açık heuristik (ünsüz-başlangıç + -en) yerine curated
liste seçildi: `opperen`/`openen` gibi tesadüfen op- ile başlayan basit
zayıf fiiller yanlış bölünürdü (opperen → *oppeerde op yerine opperde
gibi). Testler: opbellen/aanraken pozitif, opperen/openen negatif guard.
`uitleggen` zaten STRONG yoluyla doğruydu (leggen tabloda), regresyon yok.
