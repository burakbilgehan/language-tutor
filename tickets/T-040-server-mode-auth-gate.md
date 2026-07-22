---
id: T-040
title: Server modu auth/kimlik katmanı (public'e açılmadan önce blocker)
status: backlog
priority: p1
effort: L
confidence: high
depends: []
created: 2026-07-22
---
T-026 dalga 5 bulgusu. **Tehdit çerçevesi B (public/monetize eşiği)** —
bugün exploit DEĞİL (canlı deploy statik/Pages, `/api/*` route'ları
`build-static.mjs:15` ile stash'leniyor; server modu localhost tek-kullanıcı).
**Ama server modu localhost dışına açıldığı an blocker.** Bulgu
fable-verifier'dan geçti. **Verdict: CONFIRMED (mekanizma), urgency
statik-deploy gerçeğiyle sınırlı.**

Kök neden: hiçbir server route'unda auth yok (repo'da `middleware.ts` yok,
`getServerSession`/`cookies`/`requireAuth` primitifi yok) ve tek global DB
(`src/db/index.ts` DB_PATH, per-user tenant yok — multi-*profile* hepsi
owner'a ait, multi-*tenant* değil). En keskin iki route:
- **GET /api/save/export** (`src/app/api/save/export/route.ts:5`): auth'suz
  istek tüm `data/app.db`'yi (her profil, tüm ilerleme) döndürür — komple
  exfiltration.
- **POST /api/save/import** (`src/app/api/save/import/route.ts`): auth'suz
  istek paylaşılan DB'yi herkes için değiştirir (`import.ts:97`
  tmp→DB_PATH rename). S1'in (kötücül import trigger'ı) yazma yarısı.

Ama sorun bu iki route'la sınırlı değil: her mutating/LLM route'u
(curriculum generate, grammar/kanji/vocab batch, chat, translate) auth'suz
→ açıldığında kota yakma + veri erişimi. Bu, T-026'nın öngördüğü "auth
katmanı gibi büyük iş ayrı ticket" kalemi.

Repo'nun kendi kodu bu senaryoyu meşrulaştırıyor: `src/lib/llm/config.ts:31-35`
`cliAllowed()`/`LLM_CLI_DISABLED` tam da "hosted instance owner'ın Max
sub'ını yakamasın" için var — yani yazar guest-erişimli server deploy'u
öngörüyor. Ama `LLM_CLI_DISABLED` YALNIZ CLI-provider construction'ı
gate'liyor (config.ts:34), `/api/save/*` veya diğer route'lar için hiçbir
şey yapmıyor. Auth boşluğu sahipsiz (README'de operatöre "auth ekle"
yönlendirmesi de yok).

Önerilen yön: server modu için minimum bir kimlik katmanı — ör. env
tabanlı tek-token (`APP_AUTH_TOKEN`) + tüm mutating/exfil route'larını saran
`requireAuth()` middleware; ya da tam multi-tenant (per-user DB / profil
sahipliği) eğer monetize gerçek multi-user olacaksa. Karar public pivot'un
şekline bağlı. Kapsam büyük → alt-parçalara bölünebilir (route envanteri →
token gate → tenant izolasyonu).

Defense-in-depth rider'ları (bu ticket'la beraber ucuz): **S2** — server
import'a magic-header ön-kontrolü ekle (`save-image.ts:63` browser'da var,
server'da yok; near-noise ama ucuz). Job route IDOR'u (T-034, `core/jobs.ts:78`
"NO profile scoping") bu ticket kapsamında tenant'laşmalı.
