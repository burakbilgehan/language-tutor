---
id: T-046
title: Auth — better-auth (Google + magic-link) Worker'da, güvenlik gate'li
status: backlog
priority: p1
effort: L
confidence: medium
depends: [T-045]
created: 2026-07-26
---
Spike (T-045) stack'i doğruladıktan sonra auth'u prod-kalite kur. Kapsam:
**kimlik**, save-sync değil (o T-047).

- **Sağlayıcılar:** Google OAuth + magic-link (email). Apple/Facebook v2'ye
  ertelendi (Apple $99/yıl dev hesabı, Facebook app-review — başlangıçta yük).
- **Session/kullanıcı:** D1'de (better-auth D1 adapter). User ↔ hesap eşlemesi.
- **Magic-link sender:** T-045'te seçilen email sağlayıcı (CF Email Sending /
  Resend) prod'a bağlanır.

**Cookie/domain kararı (advisor, çözülmesi ZORUNLU — ertelenemez):**
site public origin + Worker farklı registrable domain = third-party session
cookie (Safari ITP bloklar, Chrome bozuyor). Seçenekler: (a) custom domain,
app+API aynı registrable domain (`app.x.com`/`api.x.com`, `SameSite=Lax`
çalışır) — advisor önerisi, en ucuz, monetize öncesi zaten istenir; (b) CF
Pages + Worker aynı origin route'ta; (c) bearer-token-in-localStorage (XSS-okunur,
KAÇIN). Karar Burak'a: **custom domain alınacak mı?**

**Güvenlik acceptance criteria (T-039'un tehdit sınıfı — review-later DEĞİL):**
Worker, public browser origin'den çağrılan authenticated API = bridge CSRF'in
aynı şekli. (1) Strict origin allowlist; (2) session cookie'de `SameSite`;
(3) state-changing route'lar auth check'ten ÖNCE çalışmasın (T-039 bug'ı tam
buydu: "handler auth'tan önce koştu"); (4) `src/lib/auth.test.ts` yalnız Next
`route.ts`'leri yürüyor — **Worker'ın kendi test-gate'i gerekir** (her
mutating Worker route'u auth kontrolü yapmalı, test'le kilitli).

Fence (T-047 ile aynı Worker codebase): `src/worker/auth/*`. T-047 ile SERİ
ya da fence-ayrık paralel + **auth önce merge**.
