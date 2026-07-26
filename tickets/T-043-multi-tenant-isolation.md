---
id: T-043
title: Gerçek multi-tenant izolasyon (per-user DB / profil sahipliği)
status: backlog
priority: p3
effort: XL
confidence: low
depends: [T-040]
created: 2026-07-26
---
T-040'tan ayrıldı (2026-07-26). T-040 env-token gate ile server modunu
localhost dışı erişime karşı KAPATIYOR (tek operatör = owner). Bu ticket
onun ötesi: **gerçek çok-kullanıcılı** senaryo — her kullanıcı kendi
verisini görsün, birbirinin job'unu iptal edemesin, save export yalnız
kendi verisini döndürsün.

**Yeniden kapsamlandı (2026-07-26):** "monetization belirsiz" gate'i
değişti — backend/kimlik işine (T-045–T-048) karar verildi (Cloudflare +
better-auth + R2). **Cloud-save tenant izolasyonu artık O işe ait**
(login'li kullanıcı yalnız kendi `saves/{userId}`'ine erişir; T-046/T-047
güvenlik kriterleri). Bu ticket'ın KALAN kapsamı: **server-mode**
(localhost/self-host Next.js) çok-kullanıcı izolasyonu — tek global
`data/app.db`'yi per-user'a bölmek. Bu hâlâ deferred: server modu bugün
tek-kullanıcı (T-040 env-token gate yeterli); gerçek self-host multi-user
talebi gelmeden dokunulmaz. Yani T-043 = "backend değil, self-host Next.js
multi-tenancy".

Kapsam (model kararınca): (1) job route IDOR — `generation_jobs`'a tenant
kolonu + scope (`core/jobs.ts:78` bugün "NO profile scoping"); (2) save
export/import tenant-scoped; (3) tüm read/mutating route'lar tenant filtresi;
(4) DB katmanı per-tenant izolasyon. T-026 dalga 5'te "kabul edilen risk"
olarak işaretlenen job IDOR bu ticket'ta kapanır.

Önkoşul: public/monetize kararı (INDEX lisans notu — FSL öneri eşiği).
Bu eşik gelmeden dokunulmaz.
