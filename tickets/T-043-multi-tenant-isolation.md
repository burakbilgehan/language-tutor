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

Şu an **açık gerekçeyle ertelendi:** monetization modeli yok. Multi-tenant
tasarımı (per-user DB dosyası mı, tek DB'de `profileId`/`userId` scope mu,
kimlik sağlayıcı: kendi auth mı OAuth mı) tam da o modele bağlı — model
kararlaşmadan yapılan izolasyon büyük olasılıkla yanlış eksende olur.

Kapsam (model kararınca): (1) job route IDOR — `generation_jobs`'a tenant
kolonu + scope (`core/jobs.ts:78` bugün "NO profile scoping"); (2) save
export/import tenant-scoped; (3) tüm read/mutating route'lar tenant filtresi;
(4) DB katmanı per-tenant izolasyon. T-026 dalga 5'te "kabul edilen risk"
olarak işaretlenen job IDOR bu ticket'ta kapanır.

Önkoşul: public/monetize kararı (INDEX lisans notu — FSL öneri eşiği).
Bu eşik gelmeden dokunulmaz.
