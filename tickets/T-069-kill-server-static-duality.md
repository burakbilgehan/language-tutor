---
id: T-069
title: Server/static ikiliğini kaldır — tek runtime olarak static'e (local-first) yakınsama
status: todo
priority: p1
effort: XL
confidence: medium
depends: []
created: 2026-07-31
---

## Sorun

Burak (2026-07-31): "server ve statik mod ayrımından bıktım. bu kadar
discrepancy ile uğraşılmaz. bir noktada bu ikililik kaldırılmalı."

Somut örnek: open-time lesson prefetch server modda 2026 başında eklendi,
static seam'e hiç taşınmadı; production static olduğu için canlıda fix'siz
davranış yaşandı (T-068'in kök nedeni). Bu bug SINIFI yapısal: iş mantığı
`src/core/*`'da ortak ama orkestrasyon (jobs, prefetch, auto-extend,
requireLlm/503 yolları) iki kez yazılıyor (`lib/jobs.ts` + route'lar vs
`client-api.ts` static dalları + in-flight map'ler).

## Karar çerçevesi

Yakınsama YÖNÜ static/local-first: production zaten static (okumo.dev),
server modun kalan işlevleri ikame edilebilir. Sonda `npm run dev` static
bundle'ı koşar; dev ile production ilk kez aynı kod yolu olur ve
"server'da düzeldi, static'te unutuldu" sınıfı imkansızlaşır.

## Ön koşullar (her biri kendi başına merge edilebilir)

1. **Fixture dev loop static'te**: browser provider'a fixture modu
   (`src/lib/llm/fixtures/` canned JSON'ları browser'dan servis).
   Token'sız dev loop'un ikamesi.
2. **Max CLI erişimi**: zaten çözülü — `npm run llm:bridge` + "Yerel köprü"
   preset'i. Sadece Burak'ın günlük akışı bridge'e geçer, doğrulanır.
3. **Seed export scriptleri** (`seed:grammar/kanji/vocab`): kaynak olarak
   `data/app.db` yerine export edilmiş .db snapshot'ı alabilmeli
   (format zaten aynı ham SQLite imajı).
4. **Burak'ın verisi**: save export/import ile tek seferlik taşıma
   (server data/app.db → browser IndexedDB).

## Sökme fazı (ön koşullar bitince)

- `/api/*` route'ları, `src/lib/jobs.ts`, `generation_jobs` bağımlı akışlar,
  T-040 auth gate (`src/lib/auth.ts` + auth.test.ts route-walker),
  `requireLlm` server yarısı, `client-api.ts`'teki IS_STATIC dallanmaları
  (fetch yolları silinir, core çağrıları kalır).
- Worker'daki auth/cloud-save route'ları KALIR (onlar app runtime değil,
  backend); `cloudAvailable`/`useAuthStatus` probe'ları değişmez.
- CLAUDE.md yeniden yazılır (mod ayrımı anlatısı düşer).

## Bedeller (bilinçli kabul)

- Kalıcı arka plan job'ları sekme ömrüne bağlanır; telafi T-068'in
  açılış-invariant kontrolü kalıbı.
- `db:studio` gibi dosya-DB konforları export edilmiş snapshot üzerinden.
- `data/app.db` merkezli ops alışkanlıkları (blast vb.) gözden geçirilmeli.

## Notlar

- T-068 bundan ÖNCE ve bağımsız gider; orkestrasyon politikasını core'a
  taşıdığı için yakınsamanın ilk tuğlası.
- T-043 (self-host multi-tenant) bu ticket'la fiilen düşer/yeniden
  kapsamlanır: server runtime silinirse self-host = static dosyalar.
