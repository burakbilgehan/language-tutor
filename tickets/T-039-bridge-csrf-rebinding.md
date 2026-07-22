---
id: T-039
title: Bridge CSRF quota-burn + DNS-rebinding çıktı exfil (llm-bridge.mjs)
status: backlog
priority: p1
effort: S
confidence: high
depends: []
created: 2026-07-22
---
T-026 dalga 5 bulgusu. **Tehdit çerçevesi A (bugün gerçek)** — bridge'i
çalıştıran kullanıcı için uzaktan web saldırganı, lokal foothold gerekmez.
Bulgu fable-verifier'dan geçti + üç POST varyantı empirik ateşlendi (hepsi
CLI spawn'a ulaştı). **Verdict: CONFIRMED.**

Kök neden: `scripts/llm-bridge.mjs` POST handler'ı (satır 233-277)
execution'ı Origin'e HİÇ gate'lemiyor. `corsHeaders` (207-218) `allowed`'ı
(209) yalnız yanıt ACAO header'ını (212) koşullamak için hesaplıyor;
`runCli` (247) her isteğe koşulsuz çalışıyor. Content-Type de kontrol
edilmiyor (`JSON.parse` her body'ye, 239).

İki ayrı saldırı:
- **CSRF quota-burn (rebinding gerekmez):** Kurban, bridge açıkken kötücül
  bir sayfayı ziyaret eder. Sayfa CORS "simple request" POST atar
  (`Content-Type: text/plain`, JSON string body) → preflight yok → tarayıcı
  isteği gönderir → CLI çalışır → owner'ın Max kotası yanar. Kör saldırı
  (evil.com ACAO alamadığı için yanıtı okuyamaz), ama side-effect gerçekleşir.
- **Çıktı exfiltration (DNS rebinding ile):** Saldırgan `attacker.com`'u
  kısa-TTL DNS ile 127.0.0.1'e rebind eder; sayfa `attacker.com:8484`'e
  fetch eder → istek same-origin olur → tarayıcı ACAO okuma kontrolü
  uygulamaz → LLM çıktısı okunur. PNA'sız tarayıcılarda (Firefox/Safari)
  çalışır; Chromium PNA preflight'ı muhtemelen bloklar (bridge `attacker.com`
  için ACAO göndermiyor). Port 8484 tahmin edilebilir. `127.0.0.1` bind'i
  rebinding'i durdurmaz (isim kurbanın kendi makinesinde loopback'e çözülür).
- **PNA header** (216): `access-control-allow-private-network: true`
  KOŞULSUZ gönderiliyor (212'nin aksine `allowed` guard'ı dışında). Tek
  başına inert ama Chromium'un B1/B2'yi bloklayacak tek savunmasını her
  origin için kapatıyor — mitigation-defeating.

Bulguların ilk sözlü mekanizması (`!origin` branch / "same-origin POST
Origin göndermez") YANLIŞTI — Fetch spec'e göre POST her zaman Origin taşır.
Risk sonucu yine de geçerli, çünkü handler Origin'e hiç bakmıyor.

Önerilen fix (küçük): (1) Host-header allowlist — `Host` başlığı
`localhost`/`127.0.0.1[:port]` değilse reddet → rebinding ölür. (2) `runCli`'yi
`allowed`'a gate'le VEYA başlangıçta üretilen bearer token iste (preset'e
göm) → simple-request CSRF ölür. (3) PNA header'ını `allowed`'a gate'le.
(4) Content-Type'ı `application/json`'a kısıtla (simple-request yolunu kapatır).
Bearer token (2) tek başına hem CSRF'i hem exfil'i kapatır (saldırgan sayfa
token'ı okuyamaz).
