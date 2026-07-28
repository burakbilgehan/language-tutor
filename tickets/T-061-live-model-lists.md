---
id: T-061
title: Canlı model listeleri — Ollama tags / OpenRouter models / bridge
status: done
priority: p3
effort: S
confidence: high
depends: [T-057, T-060]
created: 2026-07-27
---
Gelişmiş paneldeki (T-060) serbest-metin model kutularını canlı verilerle
besle; "test et"in gerçek LLM çağrısı yakmadan önce ucuz doğrulama yap.

- **Ollama**: `GET :11434/api/tags` → kullanıcının GERÇEKTEN indirdiği
  modeller dropdown'da; katalogtaki öneri inmemişse "önce `ollama pull X`"
  uyarısı (bugün: hardcoded llama3.2/3.1, inmemişse test cryptic patlıyor).
- **OpenRouter**: `GET /api/v1/models` (key'siz, public) → arama + fiyat +
  `:free` filtresi; gelişmişte tam katalog, casual akışta T-057 profilleri.
- **Bridge**: `GET :8484/v1/models` (mevcut) → aktif backend gösterimi.
- OpenAI/DeepSeek/Anthropic: canlı liste YOK (endpoint'leri gürültülü/key'li)
  — T-057 küratörlü listesi yeter.
- Test öncesi: seçili model listede yoksa (listelenebilen sağlayıcılarda)
  gerçek çağrı yakmadan anlamlı hata.

Fence: T-060'ın gelişmiş panel komponenti + küçük fetch helper'ları.
