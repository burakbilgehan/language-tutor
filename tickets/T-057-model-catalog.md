---
id: T-057
title: Model kataloğu tek kaynak — Eko/Denge/En iyi profilleri + bayat id temizliği
status: done
priority: p2
effort: M
confidence: high
depends: []
created: 2026-07-27
---
LLM bağlantı UX redesign'ının (T-060) zemini. Bugünkü sorunlar:

- Model id'leri 3+ yere saçılmış: `presets.ts` tablosu, `LlmProviderSection.tsx:91`
  ve `LlmSetupWizard.tsx:409`'da elle kopyalanmış Anthropic üçlüsü, wizard'ın
  Ollama/bridge yollarında inline literaller.
- Default'lar bayat: openai preset `gpt-4o-mini/gpt-4o` (2024), openrouter
  `claude-3.5-haiku/claude-sonnet-4/claude-opus-4` (ölü sluglar), ollama
  `llama3.2/3.1`.
- Tier→model çözümlemesi ÜÇ paralel kopya: `modelForTierConfigured` (config.ts),
  `modelForTier` (provider.ts, CLI aliasları), browser `modelFor`
  (browser-provider.ts). Boş config'de literal `"fast"` string'i model adı
  olarak API'ye gidebiliyor (gerçek bug).

## Kapsam
1. Yeni `src/lib/llm/catalog.ts` — TEK kaynak. Sağlayıcı başına:
   - `profiles: { eco, balanced, best }` — her profil somut bir
     fast/balanced/deep üçlüsü + insan-okur görünen ad ("DeepSeek V3 —
     hızlı işler" gibi).
   - Kaba fiyat metadata'sı ($/Mtok in/out) — T-060'taki bütçe ipucu bundan
     beslenir. Yerel/bridge sağlayıcılarda fiyat = 0/abonelik.
   - Güncel id'lerle doldur (2026 nesli; OpenRouter sluglarını canlı
     /models'a karşı elle doğrula).
2. `presets.ts`, wizard, `LlmProviderSection`, `ANTHROPIC_DEFAULT_MODELS`
   hepsi katalogdan beslenir; inline model literalleri silinir.
3. Tier çözümlemesini tekilleştir: env-agnostik tek helper (server üç yolu ve
   browser'ı aynı fonksiyona bağla; CLI kısa-alias davranışı korunur).
   Literal-tier fallback'i kaldır — model çözülemiyorsa anlamlı hata.
4. Config şekli DEĞİŞMEZ (`models: {fast,balanced,deep}` kalır — kayıtlı
   config'ler ve save'ler bozulmaz); katalog yalnızca bu şekli DOLDURAN
   üst katman.

Fence: `src/lib/llm/*` + iki settings komponentinde yalnız import/sabit
satırları. `src/core`/DB yok → parity harness gerekmez. Doğrulama: tsc,
`npm test`, `LLM_PROVIDER=fixture` smoke, statik build'de browser yolu.
Tazelik otomasyonu AYRI ticket: T-058.
