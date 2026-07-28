---
id: T-059
title: Bridge blackbox'lama — npx paketi + /health + opencode kararı
status: done
priority: p2
effort: M
confidence: high
depends: []
created: 2026-07-27
---
Burak kararı (2026-07-27): bridge kalıyor (kendisi kullanıyor), ama akış
"curl indir + node çalıştır" yerine tek komut olacak ve site köprüyü canlı
algılayabilecek (algılama UI'ı T-060'ta; bu ticket altyapı).

## Kapsam
1. **npm paketi `okumo-bridge`**: `scripts/llm-bridge.mjs` bin entry'li
   pakete sarılır → kullanıcı komutu `npx okumo-bridge` (+ `--backend`,
   `--origin` aynen). Sürüm pinli; siteden servis edilen `llm-bridge.mjs`
   fallback olarak KALIR (npm registry'ye erişemeyen/istemeyen için).
   Ops: npm publish Burak hesabından — release adımı README'ye.
2. **`GET /health`**: `{ ok, backend, cliFound }` döner (`cliFound` =
   backend CLI'ı PATH'te var mı — ucuz `which`; CLI login durumu çağrı
   yapmadan bilinemez, iddia edilmez). T-039 kuralları AYNEN uygulanır:
   Host allowlist + origin gate + PNA header'ı /health için de — probe
   siteden gelecek, allowlist dışı origin'e sızıntı yok.
3. **opencode kararı**: bridge 5 backend destekliyor, wizard 4 gösteriyor.
   Karar: opencode bridge'te kalır, ana akışa ÇIKMAZ; T-060'ın gelişmiş
   panelinde "diğer backend'ler" satırıyla belgelenir.

Fence: `scripts/llm-bridge.mjs` + yeni paket dizini (`packages/okumo-bridge/`
ya da script'i paketleyen minimal yapı — session'da seç) + build-static'in
kopyalama adımı korunur. App koduna dokunmaz → T-057 ile paralel güvenli.
