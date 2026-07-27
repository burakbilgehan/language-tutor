---
id: T-062
title: OpenRouter PKCE tek-tık bağlantı ("OpenRouter ile bağlan")
status: backlog
priority: p3
effort: M
confidence: medium
depends: [T-060]
created: 2026-07-27
---
KARAR-GATE: Burak henüz emin değil ("api key zaten basit") — T-060 oturduktan
sonra istenirse çekilir; redesign dalgasını şişirmemek bilinçli karar.

## Araştırma özeti (2026-07-27, saha araştırması session'ı)
- Abonelik-OAuth yolu KAPALI: Anthropic legal sayfası üçüncü partinin
  Claude.ai login sunmasını/kullanıcı abonelik kimliğiyle istek yönlendirmesini
  açıkça yasaklıyor (Oca 2026 sunucu bloğu + Nis 2026 yaptırım); Google aynı
  (Gemini CLI OAuth üçüncü partide ihlal, Haz 2026'da bireysel katman kapandı).
  OpenAI gri-tolere (Codex OAuth, resmî program GA değil) — izlemede.
- OpenRouter PKCE ise RESMÎ ve canlı: `openrouter.ai/auth?callback_url=…&
  code_challenge=…(S256)` → onay → `POST /api/v1/auth/keys` ile kullanıcıya
  ait gerçek API key. Tarayıcıdan çalışır (client secret yok, CORS açık) →
  statik modda key localStorage'da kalır, BİZDE emanet yok. Kullanıcı
  openrouter.ai/keys'ten iptal edebilir.
- `:free` modeller: 20 istek/dk; 50 istek/gün (hesap ömründe $10+ kredi
  aldıysa kalıcı 1000/gün).

## Burak'ın sorusunun cevabı (ticket'a gömülü kalsın)
"Bu key Claude da çağırabilir, Çin modeli de — kullanıcı nasıl ayarlayacak?"
→ Ayarlamaz. Model her istekte BİZİM app tarafından `model` parametresiyle
seçilir; key sadece ödemeyi taşır. Kalite profili (T-060) OpenRouter için de
somut slug üçlüsü doldurur (Eko → :free/deepseek, Denge → sonnet sınıfı,
En iyi → opus/frontier); gelişmişte T-061 canlı katalog. Yani UX diğer
sağlayıcılarla birebir aynı — PKCE yalnızca "key kopyala-yapıştır" adımını
"OpenRouter ile bağlan" düğmesine çevirir.

## Kapsam
- API-key kapısında OpenRouter seçiliyken "OpenRouter ile bağlan" düğmesi
  (PKCE S256; callback = site origin'i; statik+server iki modda da çalışmalı).
- Bağlıyken kalan kredi gösterimi: `GET /api/v1/key` → `limit_remaining`
  (T-063 durum kartına beslenebilir).
- Key saklama mevcut config yolundan (localStorage / llm-config.json) —
  yeni saklama katmanı İCAT ETME.
