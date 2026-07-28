---
id: T-066
title: LLM config save-yolu kontratı — key taşınması + concurrency düşmesi + önce-test-sonra-kaydet
status: backlog
priority: p2
effort: S
confidence: high
depends: []
created: 2026-07-28
---
T-060 kör review'ının (2026-07-28 gece dalgası) fence dışı kalan üç bulgusu.
Hepsi `PUT /api/llm-config` + statik eşleniği (client-api/core) kontratına ait
— T-060/T-061/T-063 bilinçli dokunmadı.

## 1. Cloud→lokal geçişte eski apiKey localhost'a taşınıyor (en önemli)
Save yolu "boş apiKey input = kayıtlı key'i koru" kuralını baseUrl'den
bağımsız uyguluyor. Repro: DeepSeek key'li config → lokal kapıdan bridge
kaydet → `{baseUrl:"http://localhost:8484/v1", apiKey:"sk-deepseek-…"}`.
`http-provider.ts` her istekte `Bearer` olarak gönderiyor — DeepSeek key'i
localhost:8484'te dinleyen her sürece sızıyor. Fix yönü: hedef sağlayıcı
`needsKey === false` ise key'i temizle, ya da key korumayı aynı-baseUrl
kaydına daralt. Pre-existing ama T-060 IA'sı kapılar arası geçişi rutin yaptı.

## 2. Her kayıt `concurrency`'yi düşürüyor
PUT replace-all; ne wizard ne LlmAdvancedPanel `concurrency` gönderiyor
(panel hydrate'te okuyor ama hiçbir alana bağlamıyor). Elle ayarlanmış değer
her kayıtta undefined'a döner → queue LLM_CONCURRENCY → 1'e düşer.

## 3. `testAndSave` önce kaydediyor, sonra test ediyor (pre-existing)
Başarısız test bozuk config'i diskte bırakıyor ve `llmConfigured()` true
dönüyor; düğme "test et ve kaydet" dediği için yanıltıcılık arttı. Sıra
tersine çevrilmeli (test → başarılıysa kaydet) — davranış değişikliği olduğu
için bilinçli ayrı ticket (T-060 merge fix'ine sıkıştırılmadı).

Fence notu: route + `client-api.ts` + statik core yolu birlikte değişmeli;
T-062 (OpenRouter PKCE) key yazma noktasına dokunuyorsa önce o merge edilsin.
